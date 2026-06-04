package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type AppConfig struct {
	Port           string
	DatabaseURL    string
	AllowedOrigins string
	FetcherMode    string
	RabbitMQURL    string
}

func LoadConfig() *AppConfig {
	err := godotenv.Load()
	if err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	config := &AppConfig{
		Port:           os.Getenv("PORT"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		AllowedOrigins: os.Getenv("ALLOWED_ORIGINS"),
		FetcherMode:    os.Getenv("FETCHER_MODE"),
		RabbitMQURL:    os.Getenv("RABBITMQ_URL"),
	}
	return config
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
