package mock

import (
	"fmt"

	"github.com/google/uuid"
)

type PaymentService struct{}

func NewPaymentService() *PaymentService {
	return &PaymentService{}
}

func (s *PaymentService) Charge(invoiceID string, amount float64, scenario string) (string, string, error) {
	switch scenario {
	case "success":
		return "paid", uuid.New().String(), nil
	case "failed":
		return "failed", uuid.New().String(), nil
	default:
		return "", "", fmt.Errorf("unsupported scenario: %s (use 'success' or 'failed')", scenario)
	}
}
