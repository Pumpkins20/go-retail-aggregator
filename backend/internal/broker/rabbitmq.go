package broker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type TaskPayload struct {
	SupplierID string `json:"supplier_id"`
	Action     string `json:"action"` // fetch, etc
}

type RabbitMQBroker struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	queue   amqp.Queue
}

func NewRabbitMQBroker(url string) (*RabbitMQBroker, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to rabbitmq: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	q, err := ch.QueueDeclare(
		"tasks",
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no wait
		nil,   // arguments
	)

	if err != nil {
		return nil, fmt.Errorf("failed to declare a queue: %w", err)
	}

	log.Printf("Successfully connected to RabbitMQ")
	return &RabbitMQBroker{
		conn:    conn,
		channel: ch,
		queue:   q,
	}, nil
}

func (b *RabbitMQBroker) PublishSyncTask(ctx context.Context, supplierID string) error {
	payload := TaskPayload{
		SupplierID: supplierID,
		Action:     "SYNC_STOCK",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err = b.channel.PublishWithContext(ctx,
		"",           // exchange default
		b.queue.Name, // routing key
		false,        // mandatory
		false,        // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent, // make sure data secure in disk not ram
			Body:         []byte(body),
		})
	if err != nil {
		return fmt.Errorf("failed to publish a message: %w", err)
	}

	log.Printf("Successfully published task for supplier %s", supplierID)
	return nil
}

func (b *RabbitMQBroker) Close() {
	if b.channel != nil {
		b.channel.Close()
	}
	if b.conn != nil {
		b.conn.Close()
	}
}

func (b *RabbitMQBroker) ConsumeSyncTask() (<-chan amqp.Delivery, error) {
	return b.channel.Consume(
		b.queue.Name,
		"",    // consumer tag
		false, // auto ack
		false, // exclusive
		false, // no local
		false, // no wait
		nil,   // args
	)
}
