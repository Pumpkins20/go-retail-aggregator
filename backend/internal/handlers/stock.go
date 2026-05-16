package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/models"
	"backend/internal/services"
)

func StockHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origins", "*")
	w.Header().Set("Content-Type", "application/json")

	suppliers := map[string]services.Storer{
		"MySQL": &services.MySQLService{},
		"Tokopedia": &services.HTTAPIService{
			URL:  "https://api.tokopedia.com/stock",
			Name: "Tokopedia API",
		},
		"Shopee": &services.HTTAPIService{
			URL:  "https://api.shopee.com/stock",
			Name: "Shopee API",
		},
		"Lazada": &services.HTTAPIService{
			URL:  "https://api.lazada.com/stock",
			Name: "Lazada API",
		},
	}

	ch := make(chan models.Result)

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	for name, service := range suppliers {
		go func(name string, service services.Storer) {
			resultCh := make(chan int, 1)
			go func() {
				resultCh <- service.GetStock(1)
			}()

			select {
			case <-ctx.Done():
				ch <- models.Result{Resource: name, Stock: 0, Status: "Timeout"}
			case stock := <-resultCh:
				ch <- models.Result{Resource: name, Stock: stock, Status: "Success"}
			}
		}(name, service)
	}

	var results []models.Result

	for i := 0; i < len(suppliers); i++ {
		results = append(results, <-ch)
	}

	json.NewEncoder(w).Encode(results)
}
