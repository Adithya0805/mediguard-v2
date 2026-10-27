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

const ALL_AGENTS = ['intake', 'multimodal', 'symptom', 'diagnosis', 'drug_check', 'report'];

export function useAgentStream(sessionId: string | null, initialStatus?: string) {
  const [state, setState] = useState<AgentStreamState>({
    isConnected: false,
    isPipelineRunning: initialStatus === 'processing',
    isPipelineComplete: initialStatus === 'completed',
    events: [],
    currentAgent: null,
    completedAgents: initialStatus === 'completed' ? ALL_AGENTS : [],
    failedAgents: initialStatus === 'failed' ? ['intake'] : [],
    pipelineData: {},
    error: initialStatus === 'failed' ? 'Clinical analysis pipeline failed.' : null,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track complete status in a ref to avoid reconnecting if it completed during a closed socket
  const isCompleteRef = useRef(initialStatus === 'completed');

  // React to status changes when initialStatus changes after mount
  useEffect(() => {
    if (initialStatus === 'completed') {
      isCompleteRef.current = true;
      setState((prev) => ({
        ...prev,
        isPipelineComplete: true,
        isPipelineRunning: false,
        completedAgents: ALL_AGENTS,
        error: null
      }));
    } else if (initialStatus === 'processing') {
      setState((prev) => ({
        ...prev,
        isPipelineRunning: true,
        isPipelineComplete: false
      }));
    } else if (initialStatus === 'failed') {
      setState((prev) => ({
        ...prev,
        isPipelineRunning: false,
        error: 'Clinical analysis pipeline failed.'
      }));
    }
  }, [initialStatus]);

  // Load completed report details if initialStatus is completed
  useEffect(() => {
    if (initialStatus === 'completed' && sessionId) {
      const fetchCompletedReport = async () => {
        try {
          const { getReport } = await import('@/lib/api');
          const report = await getReport(sessionId);
          setState((prev) => ({
            ...prev,
            isPipelineComplete: true,
            isPipelineRunning: false,
            completedAgents: ALL_AGENTS,
            pipelineData: {
              total_duration_seconds: 15.0,
              primary_diagnosis: report.differential_diagnosis?.[0]?.diagnosis || 'AI Clinical Synthesis Finalized',
              urgency_level: report.urgency_level || 'medium',
            }
          }));
        } catch (e) {
          console.error('Failed to load completed report details:', e);
        }
      };
      fetchCompletedReport();
    }
  }, [sessionId, initialStatus]);

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
              if (parsedEvent.agent_name && !completedAgents.includes(parsedEvent.agent_name)) {
                completedAgents = [...completedAgents, parsedEvent.agent_name];
              }
              currentAgent = null;
              break;
            case 'agent_failed':
              if (parsedEvent.agent_name && !failedAgents.includes(parsedEvent.agent_name)) {
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

  const sendMessage = useCallback((msg: string): boolean => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(msg);
      return true;
    }
    return false;
  }, []);

  const clearEvents = useCallback(() => {
    setState((prev) => ({ ...prev, events: [] }));
  }, []);

  const simulatePipeline = useCallback(() => {
    // 1. Reset state
    setState((prev) => ({
      ...prev,
      isPipelineRunning: true,
      isPipelineComplete: false,
      completedAgents: [],
      failedAgents: [],
      currentAgent: null,
      error: null,
      pipelineData: {}
    }));
    isCompleteRef.current = false;

    // 2. If websocket open, trigger backend simulation
    const sent = sendMessage('simulate');
    
    // 3. Always run client step progression as well to guarantee zero latency and visual feedback
    const simulatedSteps = [
      {
        delay: 200,
        event: {
          event_type: 'pipeline_started',
          session_id: sessionId || 'demo-session',
          agent_name: null,
          timestamp: new Date().toISOString(),
          message: 'MediGuard AI LangGraph pipeline initiated',
          data: { total_agents: 6, agents_sequence: ALL_AGENTS }
        }
      },
      {
        delay: 1500,
        event: {
          event_type: 'agent_started',
          session_id: sessionId || 'demo-session',
          agent_name: 'intake',
          timestamp: new Date().toISOString(),
          message: 'Intake Agent: Normalizing clinical parameters & enforcing HIPAA de-identification...',
          data: { agent_display_name: 'Intake Agent', estimated_seconds: 5 }
        }
      },
      {
        delay: 3500,
        event: {
          event_type: 'agent_completed',
          session_id: sessionId || 'demo-session',
          agent_name: 'intake',
          timestamp: new Date().toISOString(),
          message: 'Intake Agent verified: PHI redacted, 768-dim embedding initialized.',
          data: { duration_seconds: 2.0, intake_confidence: 0.96 }
        }
      },
      {
        delay: 4500,
        event: {
          event_type: 'agent_started',
          session_id: sessionId || 'demo-session',
          agent_name: 'multimodal',
          timestamp: new Date().toISOString(),
          message: 'Vision & Labs: Digitizing LOINC cardiac biomarkers & scanning 12-lead ECG rhythm strip...',
          data: { agent_display_name: 'Vision & Labs Agent', estimated_seconds: 6 }
        }
      },
      {
        delay: 7000,
        event: {
          event_type: 'agent_completed',
          session_id: sessionId || 'demo-session',
          agent_name: 'multimodal',
          timestamp: new Date().toISOString(),
          message: 'Vision & Labs verified: Troponin I elevation confirmed, sinus rhythm at 104 bpm.',
          data: { duration_seconds: 2.5, biomarkers: ['Troponin I', 'CK-MB', 'BNP'] }
        }
      },
      {
        delay: 8000,
        event: {
          event_type: 'agent_started',
          session_id: sessionId || 'demo-session',
          agent_name: 'symptom',
          timestamp: new Date().toISOString(),
          message: 'Symptom Agent: Querying SNOMED-CT clinical vector graph for chest pressure & diaphoresis...',
          data: { agent_display_name: 'Symptom Agent', estimated_seconds: 10 }
        }
      },
      {
        delay: 11000,
        event: {
          event_type: 'agent_completed',
          session_id: sessionId || 'demo-session',
          agent_name: 'symptom',
          timestamp: new Date().toISOString(),
          message: 'Symptom Agent verified: High-acuity acute coronary syndrome cluster matched.',
          data: { duration_seconds: 3.0, symptom_severity: 'critical' }
        }
      },
      {
        delay: 12000,
        event: {
          event_type: 'agent_started',
          session_id: sessionId || 'demo-session',
          agent_name: 'diagnosis',
          timestamp: new Date().toISOString(),
          message: 'Diagnosis Agent: Multi-agent debate generating calibrated differential diagnosis...',
          data: { agent_display_name: 'Diagnosis Agent', estimated_seconds: 15 }
        }
      },
      {
        delay: 15500,
        event: {
          event_type: 'agent_completed',
          session_id: sessionId || 'demo-session',
          agent_name: 'diagnosis',
          timestamp: new Date().toISOString(),
          message: 'Diagnosis Agent verified: Ranked 4 differential candidates (NSTEMI probability 91%).',
          data: { duration_seconds: 3.5, ddx_count: 4 }
        }
      },
      {
        delay: 16500,
        event: {
          event_type: 'agent_started',
          session_id: sessionId || 'demo-session',
          agent_name: 'drug_check',
          timestamp: new Date().toISOString(),
          message: 'Drug Agent: Screening OpenFDA database for drug-drug contraindication matrix...',
          data: { agent_display_name: 'Drug Agent', estimated_seconds: 8 }
        }
      },
      {
        delay: 19500,
        event: {
          event_type: 'agent_completed',
          session_id: sessionId || 'demo-session',
          agent_name: 'drug_check',
          timestamp: new Date().toISOString(),
          message: 'Drug Agent verified: Cross-checked active medications against FDA adverse event directories.',
          data: { duration_seconds: 3.0, interactions_found: 1 }
        }
      },
      {
        delay: 20500,
        event: {
          event_type: 'agent_started',
          session_id: sessionId || 'demo-session',
          agent_name: 'report',
          timestamp: new Date().toISOString(),
          message: 'Report Agent: Compiling physician technical SOAP summary & patient plain-language guide...',
          data: { agent_display_name: 'Report Agent', estimated_seconds: 12 }
        }
      },
      {
        delay: 23500,
        event: {
          event_type: 'agent_completed',
          session_id: sessionId || 'demo-session',
          agent_name: 'report',
          timestamp: new Date().toISOString(),
          message: 'Report Agent verified: Dual clinical briefs synthesized with HIPAA audit validation.',
          data: { duration_seconds: 3.0, urgency_level: 'critical' }
        }
      },
      {
        delay: 24500,
        event: {
          event_type: 'pipeline_completed',
          session_id: sessionId || 'demo-session',
          agent_name: null,
          timestamp: new Date().toISOString(),
          message: 'Clinical analysis complete. Report ready for physician review.',
          data: {
            total_duration_seconds: 24.5,
            urgency_level: 'critical',
            primary_diagnosis: 'Acute Coronary Syndrome (NSTEMI)',
            ddx_count: 4,
            report_generated: true
          }
        }
      }
    ];

    simulatedSteps.forEach(({ delay, event }) => {
      setTimeout(() => {
        setState((prev) => {
          const updatedEvents = [...prev.events, event as AgentEvent];
          let { isPipelineRunning, isPipelineComplete, currentAgent, completedAgents, failedAgents, pipelineData, error } = prev;
          
          switch (event.event_type) {
            case 'pipeline_started':
              isPipelineRunning = true;
              isPipelineComplete = false;
              completedAgents = [];
              failedAgents = [];
              currentAgent = null;
              error = null;
              break;
            case 'agent_started':
              currentAgent = event.agent_name;
              break;
            case 'agent_completed':
              if (event.agent_name && !completedAgents.includes(event.agent_name)) {
                completedAgents = [...completedAgents, event.agent_name];
              }
              currentAgent = null;
              break;
            case 'pipeline_completed':
              isPipelineComplete = true;
              isPipelineRunning = false;
              pipelineData = event.data;
              currentAgent = null;
              isCompleteRef.current = true;
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
            error
          };
        });
      }, delay);
    });
  }, [sendMessage, sessionId]);

  // Clean logger helper to avoid console spam in production
  function loggerDebug(msg: string) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[useAgentStream] ${msg}`);
    }
  }

  return {
    ...state,
    reconnect,
    sendMessage,
    clearEvents,
    simulatePipeline
  };
}
