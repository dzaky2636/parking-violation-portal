package eventbus

import "log"

type Event struct {
	RoutingKey string
	Body       []byte
}

type Bus struct {
	ch       chan Event
	handlers map[string][]func([]byte)
}

func New() *Bus {
	return &Bus{
		ch:       make(chan Event, 100),
		handlers: make(map[string][]func([]byte)),
	}
}

func (b *Bus) Publish(routingKey string, body []byte) {
	b.ch <- Event{RoutingKey: routingKey, Body: body}
}

func (b *Bus) Subscribe(routingKey string, handler func([]byte)) {
	b.handlers[routingKey] = append(b.handlers[routingKey], handler)
}

func (b *Bus) Start() {
	go func() {
		for event := range b.ch {
			if handlers, ok := b.handlers[event.RoutingKey]; ok {
				for _, h := range handlers {
					h(event.Body)
				}
			} else {
				log.Printf("eventbus: no handler for routing key %q", event.RoutingKey)
			}
		}
	}()
}
