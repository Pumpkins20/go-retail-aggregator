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