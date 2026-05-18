package models

import "time"

type Product struct {
	ID    int
	Name  string
	Stock int
}

type Result struct {
	SupplierID   int       `json:"Supplier_id"`
	SupplierName string    `json:"Supplier_name"`
	Stock        int       `json:"Stock_available"`
	Status       string    `json:"Status"`
	LatencyMS    int64     `json:"Latency_ms"`
	FetchedAt    time.Time `json:"Fetch_at"`
	ErrorMessage *string   `json:"Error_message"`
}

type FinalResult struct {
	TotalStock        int       `json:"Total_stock"`
	SuccessfulSources int       `json:"Successful_suppliers"`
	FailedSources     int       `json:"Failed_suppliers"`
	FetchedAt         time.Time `json:"Fetched_at"`
	Suppliers         []Result  `json:"Suppliers"`
}
