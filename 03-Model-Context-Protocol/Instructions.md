node -v

## Pacote com instalação global

npm i -g ntl

## Remover todos os containers anteriores:

docker rm -f $(docker ps -aq)

## Remover todas as imagens (opcional):

docker rmi -f $(docker images -aq)

## Atualziar LangChain:

npm install @langchain/langgraph@latest

### Limpar cache do NPX

npx clear-npx-cache
