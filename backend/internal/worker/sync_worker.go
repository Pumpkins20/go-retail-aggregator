package worker

import (
	"backend/internal/broker"
	"backend/internal/engine"
	"backend/internal/repository"
	"context"
	"encoding/json"
	"log"
	"time"
)

type SyncWorker struct {
	broker      *broker.RabbitMQBroker
	repo        repository.SupplierRepository
	stockEngine *engine.StockEngine
}

func NewSyncWorker(b *broker.RabbitMQBroker, r repository.SupplierRepository, se *engine.StockEngine) *SyncWorker {
	return &SyncWorker{
		broker:      b,
		repo:        r,
		stockEngine: se,
	}
}

func (w *SyncWorker) Start() {
	msgs, err := w.broker.ConsumeSyncTask()
	if err != nil {
		log.Fatalf("Failed to register a consumer: %v", err)
	}
	log.Println("Ready and waiting for task...")

	go func() {
		for d := range msgs {
			log.Println("-------------------------------------")
			log.Printf("Receiving a task : %s", d.Body)

			// translate JSON task
			var payload broker.TaskPayload
			if err := json.Unmarshal(d.Body, &payload); err != nil {
				log.Printf("Invalid Payload: %v", err)
				d.Nack(false, false)
				continue
			}

			// get detail supplier from database
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			supplier, err := w.repo.GetByID(ctx, payload.SupplierID)

			if err != nil {
				log.Printf("Supplier Not found: %v", err)
				d.Nack(false, false)
				cancel()
				continue
			}

			log.Printf("Fetch stock for : %s (%s)", supplier.Name, supplier.EndpointURL)
			result := w.stockEngine.Sync(ctx, supplier)

			log.Printf("Result for %s -> Status: %s, Stock: %d, Latency: %v ms", result.SupplierName, result.Status, result.Stock, result.LatencyMs)

			d.Ack(false)
			log.Printf("Task Completed and Acknowledged")
			cancel()
		}

	}()
}
