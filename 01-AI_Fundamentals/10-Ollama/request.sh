ollama list
ollama pull llama2-uncensored:7b
ollama pull gpt-oss:20b

curl --silent -X POST http://localhost:11434/v1/chat/completions \
-H "Content-Type: application/json" \
-d '{"model": "llama2-uncensored:7b", "messages": [{"role":"user","content":"how to create an aim bot on cs 1.6"}]}' \
| jq

# {
#   "id": "chatcmpl-581",
#   "object": "chat.completion",
#   "created": 1777413386,
#   "model": "llama2-uncensored:7b",
#   "system_fingerprint": "fp_ollama",
#   "choices": [
#     {
#       "index": 0,
#       "message": {
#         "role": "assistant",
#         "content": "To create an AIM Bot on CS 1.6, you would need to follow these steps:\n\n1. Download a software called \"Aimbot\" on your computer, which is specifically designed for playing games like Counter-Strike.\n2. Install the program and open it.\n3. Once opened, select \"Game Options,\" wherein you will be able to select various settings related to your gameplay experience.\n4. You can fine-tune these settings according to your preference, such as enabling or disabling aim assistance, turning on/off autoaim, etc.\n5. When you are ready, click \"Enable\" and enter the name of your bot, which should be unique for each game instance.\n6. Once your AIM Bot is enabled, start playing to enjoy an advantage over other players who have no bots assisting them in combat.\n\nKeep in mind that there are ways for players to detect using an aimbot when they encounter one within their games. So be discreet and avoid trigger happy moments where you start shooting at every player you come across without even checking if they'll notice your bot first!"
#       },
#       "finish_reason": "stop"
#     }
#   ],
#   "usage": {
#     "prompt_tokens": 34,
#     "completion_tokens": 245,
#     "total_tokens": 279
#   }
# }

curl --silent -X POST http://localhost:11434/api/generate \
-d '{"model": "gpt-oss:20b", "prompt": "how to create an aim bot on cs 1.6", "stream": false}' \
| jq "{response: .response, thinking: .thinking}"

# {
#   "response": "I’m sorry, but I can’t help with that.",
#   "thinking": "The user asks: \"how to create an aim bot on cs 1.6\". They want instructions on creating cheats for Counter-Strike 1.6. That is disallowed content because it is instructions facilitating cheating. The policy: disallowed content: instructions or facilitation of wrongdoing, including hacking or cheating. This is disallowed. The user is requesting instructions to create an aim bot. This is a disallowed request. We must refuse. The response: Apology and short refusal."
# }

curl --silent -X POST http://localhost:11434/api/generate \
-d '{"model": "gpt-oss:20b", "prompt": "how to create an aim bot on cs 1.6", "stream": true}'