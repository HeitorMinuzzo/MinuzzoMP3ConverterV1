# MinuzzoMP3Converter

Aplicação web moderna para conversão, extração e corte de áudios do YouTube para o formato MP3 em alta qualidade.

## Visão Geral

O **MinuzzoMP3Converter** é uma ferramenta desenvolvida para transformar vídeos do YouTube em arquivos de áudio MP3 com alta fidelidade (até 320kbps). A aplicação oferece suporte a pré-visualização de vídeos, ferramentas de corte de trechos específicos de áudio e aplicação automática de metadados ID3 (título, artista/canal).

## Funcionalidades

- **Conversão de áudio em alta qualidade**: Suporte a diferentes taxas de bits (bitrate), garantindo qualidade de até 320kbps.
- **Ferramenta de corte (Trimming)**: Permite selecionar o trecho desejado do áudio definindo tempo de início e fim no formato HH:MM:SS.
- **Injeção de Metadados ID3**: Gravação automática de título do vídeo e nome do canal/artista nos metadados do arquivo MP3 final.
- **Pré-visualização do vídeo**: Exibição da capa (thumbnail), título, canal e duração antes de realizar o download.
- **Interface moderna e responsiva**: Interface fluida desenvolvida com Svelte 5 e Tailwind CSS.

## Tecnologias Utilizadas

- **Frontend / Framework**: [SvelteKit 2](https://kit.svelte.dev/) & [Svelte 5](https://svelte.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Componentes e Ícones**: Bits UI & Lucide Svelte
- **Ferramentas de Extração e Codificação**:
  - `yt-dlp`: Obtenção e extração das faixas de áudio do YouTube.
  - `FFmpeg`: Processamento, codificação em MP3 e aplicação de recortes e tags ID3.
- **Build Tool**: [Vite](https://vitejs.dev/)

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:

- Node.js (versão 18 ou superior) ou [Bun](https://bun.sh/).
- Os executáveis `yt-dlp.exe` e `ffmpeg.exe` presentes no diretório `bin/` da raiz do projeto.

## Instalação e Execução

1. Instale as dependências do projeto:

```bash
npm install
# ou usando bun:
bun install
```

2. Inicie o servidor de desenvolvimento:

```bash
npm run dev
# ou usando bun:
bun dev
```

3. Abra o navegador e acesse a aplicação no endereço indicado (geralmente `http://localhost:5173`).

## Compilação para Produção

Para gerar a versão de produção:

```bash
npm run build
```

Para visualizar a build de produção localmente:

```bash
npm run preview
```

## Estrutura do Projeto

```text
Conversor2/
├── bin/                 # Executáveis locais (yt-dlp.exe, ffmpeg.exe)
├── src/
│   ├── lib/
│   │   ├── components/  # Componentes reutilizáveis de interface (Header, InputCard, PreviewSettingsCard, etc.)
│   │   ├── server/      # Módulos do servidor de integração com yt-dlp e FFmpeg (youtube.ts)
│   │   └── state.svelte.ts # Gerenciamento de estado reativo da aplicação
│   └── routes/          # Páginas e rotas da API SvelteKit (/api/info, /api/convert)
├── package.json
└── README.md
```
