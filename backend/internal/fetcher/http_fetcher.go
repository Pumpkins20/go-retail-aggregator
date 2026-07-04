package fetcher

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"backend/internal/models"
)

type HttpFetcher struct {
	client *http.Client
}

type DummyJsonResponse struct {
	Products []struct {
		SKU   string  `json:"sku"`
		Name  string  `json:"name"`
		Price float64 `json:"price"`
		Stock int     `json:"stock"`
	} `json:"products"`
}

type FakeStoreResponse struct {
	Rating struct {
		Count int `json:"count"`
	} `json:"rating"`
}

func (f *HttpFetcher) Fetch(ctx context.Context, supplier models.Supplier) models.FetchResult {
	start := time.Now()

	result := models.FetchResult{
		SupplierID:   supplier.ID,
		SupplierName: supplier.Name,
		Description:  supplier.Description,
		Stock:        0,
		Status:       "ERROR",
		LatencyMs:    0,
		FetchedAt:    start,
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, supplier.EndpointURL, nil)
	if err != nil {
		errMsg := fmt.Sprintf("Failed to create request: %v", err)
		result.ErrorMessage = &errMsg
		result.LatencyMs = time.Since(start).Microseconds()
		return result
	}

	resp, err := f.client.Do(req)
	if err != nil {
		errMsg := fmt.Sprintf("Network error or Timeout: %v", err)
		result.ErrorMessage = &errMsg
		result.LatencyMs = time.Since(start).Microseconds()
		return result
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		errMsg := fmt.Sprintf("Supplier return HTTP %d", resp.StatusCode)
		result.ErrorMessage = &errMsg
		result.LatencyMs = time.Since(start).Microseconds()
		return result
	}

	// Adapter Pattern Proccess parsing JSON
	var totalStock int

	if strings.Contains(supplier.EndpointURL, "dummyjson.com") {
		var data DummyJsonResponse
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			errMsg := "Failed to parsed DummyJSON format"
			result.ErrorMessage = &errMsg
			return result
		}
		for _, p := range data.Products {
			totalStock += p.Stock
		}
	} else if strings.Contains(supplier.EndpointURL, "fakestoreapi.com") {
		var data []FakeStoreResponse
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			errMsg := "Failed to parsed FakeStore format"
			result.ErrorMessage = &errMsg
			return result
		}
		for _, p := range data {
			totalStock += p.Rating.Count
		}
	} else {
		errMsg := "Unsupported supplier URL format"
		result.ErrorMessage = &errMsg
		return result
	}

	result.Stock = totalStock
	result.Status = "SUCCESS"
	result.LatencyMs = time.Since(start).Microseconds()

	return result
}
