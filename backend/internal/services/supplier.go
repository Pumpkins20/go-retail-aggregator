package services

import (
	"fmt"
	"math/rand"
	"time"
)

type Storer interface {
	GetStock(id int) int
}

type MySQLService struct{}

func (m *MySQLService) GetStock(id int) int {
	return rand.Intn(100)
}

type HTTAPIService struct {
	URL  string
	Name string
}

func (h *HTTAPIService) GetStock(id int) int {
	fmt.Printf("Sedang mengambil API dari URL: %s\n", h.URL)

	if h.Name == "Lazada API" {
		time.Sleep(3 * time.Second)
	}
	return rand.Intn(100)
}
