package main

import (
	"log"

	"os"
	"github.com/GoogleCloudPlatform/functions-framework-go/funcframework"
	_ "github.com/napatv/chollada_aq/cloudFn/function" // import for side-effect to register the function
)

func main() {
	port := "8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}
	if err := funcframework.Start(port); err != nil {
		log.Fatalf("funcframework.Start: %v\n", err)
	}
}