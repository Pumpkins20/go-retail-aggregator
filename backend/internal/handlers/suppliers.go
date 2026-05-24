package handlers

import (
	"errors"
	"encoding/json"
	"net/http"

	"backend/internal/models"
	"backend/internal/services"
)

type SupplierHandler struct {
	service *services.SupplierService
}

func NewSupplierHandler(service *services.SupplierService) *SupplierHandler {
	return &SupplierHandler{service: service}
}

func WriteError (w http.ResponseWriter, statusCode int,code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error" : map[string]string{
			"code": code,
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
	suppliers, err := h.service.ListSuppliers(r.Context())
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "InternalError", "Failed to fetch suppliers")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(suppliers)
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