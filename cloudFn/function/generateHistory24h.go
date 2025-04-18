package function

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/cloudevents/sdk-go/v2/event"
)

type AirQualityReading struct {
	Timestamp time.Time `json:"timestamp"`
	PM25      float64   `json:"pm25"`
	PM10      float64   `json:"pm10"`
}

func toFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case int64:
		return float64(val)
	case int:
		return float64(val)
	default:
		return 0
	}
}

// Register the CloudEvent function
func init() {
	functions.CloudEvent("GenerateHistory24h", GenerateHistory24hFirestoreTrigger)
}

// Firestore event trigger
func GenerateHistory24hFirestoreTrigger(ctx context.Context, e event.Event) error {
	log.Println("🔁 Firestore event received, regenerating history24h.json...")

	// Call the shared logic
	return GenerateHistory24h(ctx)
}


func GenerateHistory24h(ctx context.Context) error {
	projectID := os.Getenv("GCP_PROJECT")
	if projectID == "" {
		return fmt.Errorf("GCP_PROJECT environment variable is not set")
	}

	firestoreClient, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		return fmt.Errorf("firestore.NewClient: %v", err)
	}
	defer firestoreClient.Close()

	// Get readings from last 24 hours
	// now := time.Now().UTC()
	// start := now.Add(-24 * time.Hour)
	query := firestoreClient.Collection("air_quality_raw").
		OrderBy("Timestamp", firestore.Asc)
	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		return fmt.Errorf("query.Documents: %v", err)
	}
	log.Printf("🔎 Fetched %d raw documents", len(docs))
var readings []AirQualityReading
for _, doc := range docs {
	data := doc.Data()

	// Safely get and parse the Timestamp
	val, ok := data["Timestamp"]
	if !ok || val == nil {
		log.Printf("⚠️ Skipping doc %s: Timestamp missing", doc.Ref.ID)
		continue
	}

	var timestamp time.Time
	switch v := val.(type) {
	case time.Time:
		timestamp = v
	case string:
		t, err := time.Parse("2006-01-02 15:04:05 MST", v)
		if err != nil {
			log.Printf("⚠️ Skipping doc %s: Failed to parse string Timestamp: %v", doc.Ref.ID, err)
			continue
		}
		timestamp = t
	default:
		log.Printf("⚠️ Skipping doc %s: Unexpected Timestamp type: %T", doc.Ref.ID, val)
		continue
	}

	// Extract pm25 and pm10 from nested structure
	pmData, ok := data["PM"].(map[string]interface{})
	if !ok {
		log.Printf("⚠️ Skipping doc %s: Missing or invalid 'pm' field", doc.Ref.ID)
		continue
	}

	ppm, ok := pmData["PPM"].(map[string]interface{})
	if !ok {
		log.Printf("⚠️ Skipping doc %s: Missing or invalid 'ppm' field", doc.Ref.ID)
		continue
	}

	pm25 := toFloat64(ppm["25"])
	pm10 := toFloat64(ppm["10"])

	readings = append(readings, AirQualityReading{
		Timestamp: timestamp,
		PM25:      pm25,
		PM10:      pm10,
	})
}


	// Marshal to JSON
	jsonData, err := json.MarshalIndent(readings, "", "  ")
	if err != nil {
		return fmt.Errorf("json.Marshal: %v", err)
	}

	// Save to /tmp
	tmpFile := "/tmp/history24h.json"
	if err := ioutil.WriteFile(tmpFile, jsonData, 0644); err != nil {
		return fmt.Errorf("write file: %v", err)
	}

	// Upload to Cloud Storage
	bucketName := fmt.Sprintf("aq.chollada.casa")
	storageClient, err := storage.NewClient(ctx)
	if err != nil {
		return fmt.Errorf("storage.NewClient: %v", err)
	}
	defer storageClient.Close()

	object := storageClient.Bucket(bucketName).Object("public/data/history24h.json")
	writer := object.NewWriter(ctx)
	writer.ObjectAttrs.ContentType = "application/json"
	writer.ObjectAttrs.CacheControl = "public, max-age=60"

	data, err := ioutil.ReadFile(tmpFile)
	if err != nil {
		return fmt.Errorf("read file before upload: %v", err)
	}
	if _, err := writer.Write(data); err != nil {
		return fmt.Errorf("writer.Write: %v", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("writer.Close: %v", err)
	}

	log.Printf("✅ Uploaded history24h.json with %d records", len(readings))
	return nil
}
