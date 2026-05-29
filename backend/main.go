package main

import (
	"backend/internal/config"
	"backend/internal/db"
	"backend/internal/engine"
	"backend/internal/fetcher"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/services"

	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	fmt.Println("Starting Go Retail Aggregator...")

	// Load configuration
	cfg := config.LoadConfig()

	// initialize database connection
	pool, err := db.InitDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// initialize dependencies
	// initialize repositories
	supplierRepo := repository.NewSupplierRepository(pool)

	// initialize engines and fetchers
	fetcherFactory := fetcher.NewFetcherFactory(cfg.FetcherMode)
	stockEngine := engine.NewStockEngine(fetcherFactory)

	// initialize services
	supplierService := services.NewSupplierService(supplierRepo)
	stockService := services.NewStockService(supplierRepo, stockEngine)

	// initialize handlers
	supplierHandler := handlers.NewSupplierHandler(supplierService)
	stockHandler := handlers.NewStockHandler(stockService)

	// setup HTTP server and routes
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/suppliers/export", supplierHandler.ExportCSV)
	mux.HandleFunc("GET /api/v1/suppliers", supplierHandler.List)
	mux.HandleFunc("POST /api/v1/suppliers", supplierHandler.Create)
	mux.HandleFunc("PUT /api/v1/suppliers/{id}", supplierHandler.Update)
	mux.HandleFunc("DELETE /api/v1/suppliers", supplierHandler.Delete)
	mux.HandleFunc("PATCH /api/v1/suppliers/{id}/toggle", supplierHandler.Toggle)
	mux.HandleFunc("GET /api/v1/stock", stockHandler.GetStock)

	// API Health Check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok", "version":"1.0.0"}`))
	})

	// middleware for logging and CORS can be added here
	var handler http.Handler = mux
	handler = middleware.Logger(handler)
	handler = middleware.CORS(handler)
	handler = middleware.RequestID(handler)

	// Setup server with middleware (CORS)
	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: handler,
	}

	// run server in a goroutine so don't block on downstream code
	go func() {
		fmt.Printf("Server is running on http://localhost%s\n", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown on SIGINT or SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	fmt.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Failed to shutdown server: %v", err)
	}
	fmt.Println("Server gracefully stopped")
}
