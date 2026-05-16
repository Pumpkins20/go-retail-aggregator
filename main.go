package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
)

type Product struct {
	ID    int
	Name  string
	Stock int
}

type Storer interface {
	GetStock(id int) int
}

func (p *Product) UpdateStock(newStock int) {
	p.Stock = newStock
}

func PrintInfo(s Storer, id int, ch chan int) {
	stock := s.GetStock(id)
	ch <- stock
}

type Result struct {
	Resource string `json:"Supplier_name"`
	Stock    int    `json:"Stock_available"`
}

type HTTAPIService struct {
	URL  string
	name string
}

func (h *HTTAPIService) GetStock(id int) int {
	// Simulasi pengambilan data dari HTTP API
	fmt.Printf("Sedang mengambil API dari URL: %s\n", h.URL)
	return rand.Intn(100) // Mengembalikan stok acak untuk simulasi
}

func stockHandler(w http.ResponseWriter, r *http.Request) {
	supplier := map[string]Storer{

		"Tokopedia": &HTTAPIService{
			URL:  "https://api.tokopedia.com/stock",
			name: "Tokopedia API",
		},

		"Shopee": &HTTAPIService{
			URL:  "https://api.shopee.com/stock",
			name: "Shopee API",
		},

		"Lazada": &HTTAPIService{
			URL:  "https://api.lazada.com/stock",
			name: "Lazada API",
		},
	}
	ch1 := make(chan Result)

	for name, service := range supplier {
		go func(name string, service Storer) {
			stock := service.GetStock(1)
			ch1 <- Result{Resource: name, Stock: stock}
		}(name, service)
	}

	var finalData []Result

	for i := 0; i < len(supplier); i++ {
		res := <-ch1
		finalData = append(finalData, res)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(finalData)

}

func main() {
	fmt.Println("Server retail Aggregator Berjalan di Port 8080...")
	p := Product{
		ID:    1,
		Name:  "Sunscreen Belova",
		Stock: 10,
	}

	p.UpdateStock(20)
	fmt.Printf("Stock terbaru dari %s: %d\n", p.Name, p.Stock)

	http.HandleFunc("/stock", stockHandler)
	http.ListenAndServe(":8080", nil)

}
