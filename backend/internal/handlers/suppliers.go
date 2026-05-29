package handlers

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"
)

type SupplierHandler struct {
	service *services.SupplierService
}

func NewSupplierHandler(service *services.SupplierService) *SupplierHandler {
	return &SupplierHandler{service: service}
}

func WriteError(w http.ResponseWriter, statusCode int, code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

func (h *SupplierHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.Supplier
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "InvalidRequest", "Invalid JSON body")
		return
	}

	err := h.service.CreateSupplier(r.Context(), req)

	if err != nil {
		if errors.Is(err, services.ErrSupplierNameExists) {
			WriteError(w, http.StatusConflict, "SupplierNameExists", "Supplier name already exists")
			return
		}

		WriteError(w, http.StatusInternalServerError, "InternalError", "An error occurred while creating supplier")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Supplier created successfully",
	})
}

func (h *SupplierHandler) List(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	pageStr := r.URL.Query().Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limitStr := r.URL.Query().Get("limit")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}

	suppliers, totalRows, err := h.service.ListSuppliers(r.Context(), search, page, limit)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "InternalError", "Failed to fetch suppliers")
		return
	}

	totalPages := int(math.Ceil(float64(totalRows) / float64(limit)))

	response := map[string]interface{}{
		"data": suppliers,
		"meta": map[string]interface{}{
			"current_page": page,
			"limit":        limit,
			"total_rows":   totalRows,
			"total_pages":  totalPages,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierHandler) Delete(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("id")

	err := h.service.DeleteSupplier(r.Context(), supplierID)
	if err != nil {
		if errors.Is(err, services.ErrLastActiveSupplier) {
			WriteError(w, http.StatusConflict, "LastActiveSupplier", "Cannot deactivate the last active supplier")
			return
		}
		WriteError(w, http.StatusInternalServerError, "InternalError", "An error occurred while deleting supplier")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *SupplierHandler) Update(w http.ResponseWriter, r *http.Request) {
	supplierID := r.PathValue("id")
	if supplierID == "" {
		supplierID = r.URL.Query().Get("id")
	}
	if supplierID == "" {
		WriteError(w, http.StatusBadRequest, "InvalidRequest", "Supplier id is required")
		return
	}

	var req models.Supplier
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "InvalidRequest", "Invalid JSON body")
		return
	}

	err := h.service.UpdateSupplier(r.Context(), supplierID, req)
	if err != nil {
		if errors.Is(err, services.ErrSupplierNameExists) {
			WriteError(w, http.StatusConflict, "SupplierNameExists", "Supplier name already exists")
			return
		}
		WriteError(w, http.StatusInternalServerError, "InternalError", "Failed to update supplier")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Supplier updated successfully",
	})
}

func (h *SupplierHandler) Toggle(w http.ResponseWriter, r *http.Request) {
	supplierID := r.PathValue("id")
	if supplierID == "" {
		supplierID = r.URL.Query().Get("id")
	}
	if supplierID == "" {
		WriteError(w, http.StatusBadRequest, "InvalidRequest", "Supplier id is required")
		return
	}

	err := h.service.ToggleActiveStatus(r.Context(), supplierID, true)
	if err != nil {
		if errors.Is(err, services.ErrLastActiveSupplier) {
			WriteError(w, http.StatusConflict, "LastActiveSupplier", "Cannot deactivate the last active supplier")
			return
		}
		WriteError(w, http.StatusInternalServerError, "InternalError", "Failed to toggle supplier")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Supplier status updated",
	})
}

func (h *SupplierHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")

	suppliers, err := h.service.ExportSuppliersCSV(r.Context(), search)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "InternalError", "Failed to fetch suppliers for export")
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment;filename=suppliers.csv")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	header := []string{"ID", "Nama Supplier", "Deskripsi", "Endpoint URL", "Tipe Auth", "Timeout (ms)", "Status", "Mock Behavior", "Urutan Tampilan"}
	if err := writer.Write(header); err != nil {
		WriteError(w, http.StatusInternalServerError, "InternalError", "Failed to write CSV header")
		return
	}

	for _, s := range suppliers {
		description := "-"
		if s.Description != nil {
			description = *s.Description
		}

		status := "Inactive"
		if s.IsActive {
			status = "Active"
		}
		row := []string{
			s.ID.String(),
			s.Name,
			description,
			s.EndpointURL,
			s.AuthType,
			strconv.Itoa(s.TimeoutMs),
			status,
			s.MockBehavior,
			strconv.Itoa(s.DisplayOrder),
		}
		if err := writer.Write(row); err != nil {
			WriteError(w, http.StatusInternalServerError, "InternalError", "Failed to write CSV row")
			return
		}
	}
}
