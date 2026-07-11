import { useEffect, useState, useRef, useCallback } from 'react';

export interface AgentEvent {
  event_type: string;
  session_id: string;
  agent_name: string | null;
  timestamp: string;
  data: Record<string, any>;
  message: string;
}

export interface AgentStreamState {
  isConnected: boolean;
  isPipelineRunning: boolean;
  isPipelineComplete: boolean;
  events: AgentEvent[];
  currentAgent: string | null;
  completedAgents: string[];
  failedAgents: string[];
  pipelineData: Record<string, any>;
  error: string | null;
}

export function useAgentStream(sessionId: string | null) {
  const [state, setState] = useState<AgentStreamState>({
    isConnected: false,
    isPipelineRunning: false,
    isPipelineComplete: false,
    events: [],
    currentAgent: null,
    completedAgents: [],
    failedAgents: [],
    pipelineData: {},
    error: null,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track complete status in a ref to avoid reconnecting if it completed during a closed socket
  const isCompleteRef = useRef(false);

  // Construct WebSocket URL dynamically
  const getWsUrl = useCallback(() => {
    if (!sessionId) return '';
    
    let apiEnvUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiEnvUrl) {
      if (typeof window !== 'undefined') {
        // Dev fallback
        apiEnvUrl = window.location.protocol === 'https:' 
          ? `https://${window.location.host}` 
          : 'http://localhost:8000';
      } else {
        apiEnvUrl = 'http://localhost:8000';
      }
    }

    let wsBaseUrl = '';
    if (apiEnvUrl.startsWith('https://')) {
      wsBaseUrl = apiEnvUrl.replace('https://', 'wss://');
    } else if (apiEnvUrl.startsWith('http://')) {
      wsBaseUrl = apiEnvUrl.replace('http://', 'ws://');
    } else {
      // Direct URL without protocol (default to wss)
      wsBaseUrl = `wss://${apiEnvUrl}`;
    }

    // Clean up trailing slash and return the final WebSocket url
    const cleanBaseUrl = wsBaseUrl.endsWith('/') ? wsBaseUrl.slice(0, -1) : wsBaseUrl;
    return `${cleanBaseUrl}/ws/session/${sessionId}`;
  }, [sessionId]);

  const connect = useCallback(() => {
    if (!sessionId || isCompleteRef.current) return;

    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    const wsUrl = getWsUrl();
    console.log(`[useAgentStream] Connecting to WebSocket: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[useAgentStream] WebSocket connection established.');
      setState((prev) => ({ ...prev, isConnected: true, error: null }));

      // Send initial ping
      socket.send('ping');

      // Keep connection alive with 15s pings from the client side too
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      pingIntervalRef.current = setInterval(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send('ping');
        }
      }, 15000);
    };

    socket.onmessage = (event) => {
      if (event.data === 'pong') {
        loggerDebug('WebSocket received pong');
        return;
      }

      try {
        const parsedEvent: AgentEvent = JSON.parse(event.data);
        console.log('[useAgentStream] Event received:', parsedEvent);

        // Ignore heartbeat logging or storing to avoid polluting state unless needed
        if (parsedEvent.event_type === 'heartbeat') {
          return;
        }

        setState((prev) => {
          const updatedEvents = [...prev.events, parsedEvent];
          let {
            isPipelineRunning,
            isPipelineComplete,
            currentAgent,
            completedAgents,
            failedAgents,
            pipelineData,
            error,
          } = prev;

          switch (parsedEvent.event_type) {
            case 'pipeline_started':
              isPipelineRunning = true;
              isPipelineComplete = false;
              completedAgents = [];
              failedAgents = [];
              currentAgent = null;
              error = null;
              break;
            case 'agent_started':
              currentAgent = parsedEvent.agent_name;
              break;
            case 'agent_completed':
              if (parsedEvent.agent_name) {
                completedAgents = [...completedAgents, parsedEvent.agent_name];
              }
              currentAgent = null;
              break;
            case 'agent_failed':
              if (parsedEvent.agent_name) {
                failedAgents = [...failedAgents, parsedEvent.agent_name];
              }
              currentAgent = null;
              break;
            case 'pipeline_completed':
              isPipelineComplete = true;
              isPipelineRunning = false;
              isCompleteRef.current = true;
              pipelineData = parsedEvent.data;
              currentAgent = null;
              break;
            case 'pipeline_failed':
              isPipelineRunning = false;
              error = parsedEvent.data?.error || 'Pipeline execution failed.';
              currentAgent = null;
              break;
          }

          return {
            ...prev,
            events: updatedEvents,
            isPipelineRunning,
            isPipelineComplete,
            currentAgent,
            completedAgents,
            failedAgents,
            pipelineData,
            error,
          };
        });
      } catch (err) {
        console.error('[useAgentStream] Failed to parse WebSocket message:', err);
      }
    };

    socket.onclose = (event) => {
      console.log('[useAgentStream] WebSocket connection closed.', event.reason);
      setState((prev) => ({ ...prev, isConnected: false }));

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      // Auto-reconnect after 3 seconds if pipeline is still executing/pending
      if (!isCompleteRef.current && sessionId) {
        console.log('[useAgentStream] Scheduling automatic reconnection in 3 seconds...');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    socket.onerror = (err) => {
      console.error('[useAgentStream] WebSocket error encountered:', err);
      setState((prev) => ({ ...prev, error: 'WebSocket connection failed.' }));
    };
  }, [sessionId, getWsUrl]);

  useEffect(() => {
    connect();

    return () => {
      isCompleteRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    console.log('[useAgentStream] Manually triggering reconnection...');
    connect();
  }, [connect]);

  // Clean logger helper to avoid console spam in production
  function loggerDebug(msg: string) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[useAgentStream] ${msg}`);
    }
  }

  return {
    ...state,
    reconnect,
  };
}
