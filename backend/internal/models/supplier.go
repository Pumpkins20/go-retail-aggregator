package models

import (
	"time"

	"github.com/google/uuid"
)

type Supplier struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Description  *string   `json:"description"`
	EndpointURL  string    `json:"endpoint_url"`
	AuthType     string    `json:"auth_type"`
	AuthToken    *string   `json:"auth_token"`
	TimeoutMs    int       `json:"timeout_ms"`
	IsActive     bool      `json:"is_active"`
	MockBehavior string    `json:"mock_behavior"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type FetchResult struct {
	SupplierID   uuid.UUID `json:"supplier_id"`
	SupplierName string    `json:"supplier_name"`
	Description  *string   `json:"description"`
	Stock        int       `json:"stock"`
	Status       string    `json:"status"`
	LatencyMs    int       `json:"latency_ms"`
	FetchedAt    time.Time `json:"fetched_at"`
	ErrorMessage *string   `json:"error_message"`
}
