package handlers

import (
	"fmt"
	"encoding/json"
	"net/http"

	"backend/internal/services"
)

type StockHandler struct {
	service *services.StockService
}

func NewStockHandler(service *services.StockService) *StockHandler {
	return &StockHandler{service: service}
}

func (h *StockHandler) GetStock(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.GetAggregatedStock(r.Context())
	if err != nil {
		fmt.Printf("Error fetching stock data: %v\n", err)
		WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch stock data")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
