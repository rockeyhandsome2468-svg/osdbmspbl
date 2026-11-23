// Real-time WebSocket connection manager with auto-reconnect and callback listener
class OccupancyWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimeout = null;
    this.isConnected = false;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Backend runs on port 8000
    const wsUrl = `${protocol}//localhost:8000/api/ws/occupancy`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notify(data);
        } catch (e) {
          // pong or plain text
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.reconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (err) {
      this.reconnect();
    }
  }

  reconnect() {
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, 3000);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error("Error in WS subscriber callback", e);
      }
    });
  }
}

export const occupancyWS = new OccupancyWebSocketService();

