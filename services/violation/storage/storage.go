package storage

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

type SupabaseStorage struct {
	URL           string
	ServiceRoleKey string
	Bucket        string
	Client        *http.Client
}

func NewSupabaseStorage(url, serviceRoleKey, bucket string) *SupabaseStorage {
	return &SupabaseStorage{
		URL:            url,
		ServiceRoleKey: serviceRoleKey,
		Bucket:         bucket,
		Client:         &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *SupabaseStorage) UploadPhoto(file multipart.File, header *multipart.FileHeader) (string, error) {
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	objectPath := fmt.Sprintf("%s/%s", time.Now().Format("2006/01/02"), filename)

	body, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("read file: %w", err)
	}

	uploadURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.URL, s.Bucket, objectPath)
	req, err := http.NewRequest("POST", uploadURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.ServiceRoleKey)
	req.Header.Set("Content-Type", header.Header.Get("Content-Type"))
	req.Header.Set("x-upsert", "false")

	resp, err := s.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("storage upload returned %d: %s", resp.StatusCode, string(respBody))
	}

	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.URL, s.Bucket, objectPath)
	return publicURL, nil
}
