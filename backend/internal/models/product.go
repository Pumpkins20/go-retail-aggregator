package models

type Product struct {
	ID    int
	Name  string
	Stock int
}

type Result struct {
	Resource string `json:"Supplier_name"`
	Stock    int    `json:"Stock_available"`
	Status   string `json:"Status"`
}
