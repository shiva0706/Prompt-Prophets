"""
Multi-Agent Orchestrator Module for NexusAI.
Coordinates the specialized agents in synchronized team execution,
manages state transitions, and streams live telemetry to UI clients.
"""

from typing import Dict ,Any ,List ,Optional ,Callable 
import time 
import asyncio 
from .base_agent import AgentState ,AgentEvent 
from .data_agent import DataIngestionAgent 
from .preprocess_agent import DataPreprocessingAgent 
from .predictive_agent import PredictiveEngineAgent 
from .dashboard_agent import DashboardAgent 

class MultiAgentOrchestrator :
    """Team Lead / Orchestrator managing collaboration across all 4 specialized agents."""

    def __init__ (self ):
        self .agent_1 =DataIngestionAgent ()
        self .agent_2 =DataPreprocessingAgent ()
        self .agent_3 =PredictiveEngineAgent ()
        self .agent_4 =DashboardAgent ()

        self .agents =[self .agent_1 ,self .agent_2 ,self .agent_3 ,self .agent_4 ]
        self .event_subscribers :List [Callable [[Dict [str ,Any ]],Any ]]=[]
        self .pipeline_events :List [Dict [str ,Any ]]=[]
        self .is_running =False 

        for agent in self .agents :
            agent .set_event_callback (self ._dispatch_agent_event )

    def subscribe (self ,callback :Callable [[Dict [str ,Any ]],Any ]):
        """Subscribes an event listener (e.g. WebSocket connection)."""
        if callback not in self .event_subscribers :
            self .event_subscribers .append (callback )

    def unsubscribe (self ,callback :Callable [[Dict [str ,Any ]],Any ]):
        if callback in self .event_subscribers :
            self .event_subscribers .remove (callback )

    async def _dispatch_agent_event (self ,event_dict :Dict [str ,Any ]):
        """Dispatches an agent event to all active subscribers."""
        self .pipeline_events .append (event_dict )
        for sub in list (self .event_subscribers ):
            try :
                if asyncio .iscoroutinefunction (sub ):
                    await sub (event_dict )
                else :
                    sub (event_dict )
            except Exception :

                pass 

    async def broadcast_orchestrator_message (self ,message :str ,event_type :str ="ORCHESTRATOR_LOG",details :Optional [Dict [str ,Any ]]=None ):
        """Emits a team coordinator event."""
        event ={
        "id":f"orch_{time.time()}",
        "timestamp":time .time (),
        "agent_id":"orchestrator",
        "agent_name":"Nexus Orchestrator",
        "event_type":event_type ,
        "message":message ,
        "details":details or {},
        "level":"INFO"
        }
        await self ._dispatch_agent_event (event )

    async def run_pipeline (self ,config :Dict [str ,Any ])->Dict [str ,Any ]:
        """Executes full end-to-end multi-agent team pipeline."""
        self .is_running =True 
        self .pipeline_events =[]
        start_total =time .time ()

        domain =config .get ("domain","energy_grid")
        await self .broadcast_orchestrator_message (
        f"🚀 Multi-Agent Collaborative Pipeline Initialized. Target Domain: '{domain}'.",
        event_type ="PIPELINE_START",
        details =config 
        )

        try :

            await self .broadcast_orchestrator_message (
            "Triggering Agent 1: Data Scout for data extraction & telemetry profiling.",
            event_type ="AGENT_HANDOFF",
            details ={"active_agent_id":self .agent_1 .agent_id ,"step":1 }
            )
            out_agent_1 =await self .agent_1 .run (config )

            await self .broadcast_orchestrator_message (
            "Passing raw payload from Data Scout to Agent 2: Feature Forge for automated cleaning.",
            event_type ="AGENT_HANDOFF",
            details ={"active_agent_id":self .agent_2 .agent_id ,"step":2 }
            )
            out_agent_2 =await self .agent_2 .run (out_agent_1 )

            await self .broadcast_orchestrator_message (
            "Passing cleaned feature matrix to Agent 3: Predictive Oracle for competitive model tournament.",
            event_type ="AGENT_HANDOFF",
            details ={"active_agent_id":self .agent_3 .agent_id ,"step":3 }
            )
            out_agent_3 =await self .agent_3 .run (out_agent_2 )

            await self .broadcast_orchestrator_message (
            "Passing predictive intelligence to Agent 4: Canvas Architect for UI synthesis & executive KPIs.",
            event_type ="AGENT_HANDOFF",
            details ={"active_agent_id":self .agent_4 .agent_id ,"step":4 }
            )
            final_dashboard_payload =await self .agent_4 .run (out_agent_3 )

            total_duration_ms =round ((time .time ()-start_total )*1000 ,2 )

            final_dashboard_payload ["team_metadata"]={
            "total_duration_ms":total_duration_ms ,
            "agents":[a .get_metadata ()for a in self .agents ],
            "event_count":len (self .pipeline_events ),
            "timestamp":time .time ()
            }

            await self .broadcast_orchestrator_message (
            f"✅ Multi-Agent Collaboration successfully completed in {total_duration_ms}ms!",
            event_type ="PIPELINE_COMPLETE",
            details ={"total_duration_ms":total_duration_ms }
            )

            def _clean_json_floats (obj ):
                import math 
                if isinstance (obj ,float ):
                    if math .isnan (obj )or math .isinf (obj ):
                        return 0.0 
                    return obj 
                elif isinstance (obj ,dict ):
                    return {k :_clean_json_floats (v )for k ,v in obj .items ()}
                elif isinstance (obj ,(list ,tuple )):
                    return [_clean_json_floats (x )for x in obj ]
                return obj 

            return _clean_json_floats (final_dashboard_payload )

        except Exception as e :
            await self .broadcast_orchestrator_message (
            f"❌ Pipeline failed: {str(e)}",
            event_type ="PIPELINE_ERROR",
            details ={"error":str (e )}
            )
            raise e 
        finally :
            self .is_running =False 

    async def run_single_step (self ,step_number :int ,input_payload :Dict [str ,Any ])->Dict [str ,Any ]:
        """Executes a single agent step for interactive inspection."""
        if step_number ==1 :
            return await self .agent_1 .run (input_payload )
        elif step_number ==2 :
            return await self .agent_2 .run (input_payload )
        elif step_number ==3 :
            return await self .agent_3 .run (input_payload )
        elif step_number ==4 :
            return await self .agent_4 .run (input_payload )
        else :
            raise ValueError (f"Invalid step number: {step_number}. Must be between 1 and 4.")

    def get_team_status (self )->List [Dict [str ,Any ]]:
        return [a .get_metadata ()for a in self .agents ]
