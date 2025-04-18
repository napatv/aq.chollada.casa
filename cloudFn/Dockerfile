# Use an official Go runtime as a parent image
FROM golang:1.24 AS builder

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy the go.mod and go.sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum are not changed
RUN go mod tidy

# Copy the source code into the container
COPY . .

# Build the Go app
RUN go build -o main .

# Start a new stage from a smaller base image to reduce the container size
FROM gcr.io/distroless/base

# Copy the pre-built binary from the builder stage
COPY --from=builder /app/main /main

# Expose the port the app runs on
EXPOSE 8080

# Command to run the executable
CMD ["/main"]
