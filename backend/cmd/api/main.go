package main

import (
	"backend/internal/handlers"
	"fmt"
	"net/http"
)

func main() {
	fmt.Println("Starting server on :8080")

	http.HandleFunc("/stock", handlers.StockHandler)
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}
