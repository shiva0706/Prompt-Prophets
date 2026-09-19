"""
Base Agent Module for NexusAI Multi-Agent System.
Defines base class with state machine, async execution, telemetry, and event broadcasting.
"""

from typing import Dict ,Any ,List ,Optional ,Callable 
from enum import Enum 
import time 
import asyncio 
import uuid 

class AgentState (str ,Enum ):
    IDLE ="IDLE"
    THINKING ="THINKING"
    EXECUTING ="EXECUTING"
    COMPLETED ="COMPLETED"
    ERROR ="ERROR"

class AgentEvent :
    def __init__ (
    self ,
    agent_id :str ,
    agent_name :str ,
    event_type :str ,
    message :str ,
    details :Optional [Dict [str ,Any ]]=None ,
    level :str ="INFO"
    ):
        self .id =str (uuid .uuid4 ())
        self .timestamp =time .time ()
        self .agent_id =agent_id 
        self .agent_name =agent_name 
        self .event_type =event_type 
        self .message =message 
        self .details =details or {}
        self .level =level 

    def to_dict (self )->Dict [str ,Any ]:
        return {
        "id":self .id ,
        "timestamp":self .timestamp ,
        "agent_id":self .agent_id ,
        "agent_name":self .agent_name ,
        "event_type":self .event_type ,
        "message":self .message ,
        "details":self .details ,
        "level":self .level 
        }

class BaseAgent :
    """Base abstract class for specialized AI agents in the collaborative team."""

    def __init__ (
    self ,
    agent_id :str ,
    name :str ,
    role :str ,
    description :str ,
    avatar_icon :str ="bot"
    ):
        self .agent_id =agent_id 
        self .name =name 
        self .role =role 
        self .description =description 
        self .avatar_icon =avatar_icon 
        self .state =AgentState .IDLE 
        self .events :List [AgentEvent ]=[]
        self .event_callback :Optional [Callable [[Dict [str ,Any ]],Any ]]=None 
        self .execution_time_ms :float =0.0 

    def set_event_callback (self ,callback :Callable [[Dict [str ,Any ]],Any ]):
        """Sets a real-time event listener (e.g. WebSocket or UI emitter)."""
        self .event_callback =callback 

    async def emit_event (
    self ,
    event_type :str ,
    message :str ,
    details :Optional [Dict [str ,Any ]]=None ,
    level :str ="INFO"
    ):
        """Emits an event and notifies subscribers."""
        event =AgentEvent (
        agent_id =self .agent_id ,
        agent_name =self .name ,
        event_type =event_type ,
        message =message ,
        details =details ,
        level =level 
        )
        self .events .append (event )
        if self .event_callback :
            if asyncio .iscoroutinefunction (self .event_callback ):
                await self .event_callback (event .to_dict ())
            else :
                self .event_callback (event .to_dict ())

    async def log_thought (self ,thought :str ,details :Optional [Dict [str ,Any ]]=None ):
        """Simulates agent reasoning thought process."""
        await self .emit_event (
        event_type ="THOUGHT",
        message =thought ,
        details =details ,
        level ="DEBUG"
        )

        await asyncio .sleep (0.12 )

    async def log_action (self ,action_name :str ,params :Dict [str ,Any ]):
        """Logs a tool or cognitive action execution."""
        await self .emit_event (
        event_type ="ACTION",
        message =f"Executing tool: {action_name}",
        details =params ,
        level ="INFO"
        )
        await asyncio .sleep (0.15 )

    async def process (self ,input_data :Dict [str ,Any ])->Dict [str ,Any ]:
        """Core execution method to be implemented by child agents."""
        raise NotImplementedError ("Each specialized agent must implement process()")

    async def run (self ,input_data :Dict [str ,Any ])->Dict [str ,Any ]:
        """Wrapper method that manages lifecycle, timing, and error handling."""
        start_time =time .time ()
        self .state =AgentState .THINKING 
        await self .emit_event ("STATUS_CHANGE",f"{self.name} is initializing and evaluating context...",{"state":self .state .value })

        try :
            self .state =AgentState .EXECUTING 
            await self .emit_event ("STATUS_CHANGE",f"{self.name} started processing task payload.",{"state":self .state .value })

            output_data =await self .process (input_data )

            self .state =AgentState .COMPLETED 
            self .execution_time_ms =round ((time .time ()-start_time )*1000 ,2 )
            await self .emit_event (
            "STATUS_CHANGE",
            f"{self.name} successfully completed task in {self.execution_time_ms}ms.",
            {"state":self .state .value ,"execution_time_ms":self .execution_time_ms }
            )
            return output_data 

        except Exception as e :
            self .state =AgentState .ERROR 
            self .execution_time_ms =round ((time .time ()-start_time )*1000 ,2 )
            await self .emit_event (
            "ERROR",
            f"{self.name} encountered an error: {str(e)}",
            {"error":str (e ),"state":self .state .value },
            level ="ERROR"
            )
            raise e 

    def get_metadata (self )->Dict [str ,Any ]:
        return {
        "agent_id":self .agent_id ,
        "name":self .name ,
        "role":self .role ,
        "description":self .description ,
        "avatar_icon":self .avatar_icon ,
        "state":self .state .value ,
        "execution_time_ms":self .execution_time_ms 
        }
