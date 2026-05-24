package middleware

import (
	"log"
	"net/http"
	"time"
)

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (rec *responseRecorder) WriteHeader(code int) {
	rec.statusCode = code
	rec.ResponseWriter.WriteHeader(code)
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &responseRecorder{ResponseWriter: w, statusCode: http.StatusOK}

		reqID, _ := r.Context().Value(RequestIDKey).(string)
		if reqID == "" {
			reqID = "unknown"
		}
		
		next.ServeHTTP(rec, r)

		duration := time.Since(start)
		log.Printf("[REQ: %s] %s %s | Status: %d | Duration: %v\n", reqID, r.Method, r.URL.Path, rec.statusCode, duration)
	})
}
