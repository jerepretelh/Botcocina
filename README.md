
  # Thermomix Recipe Prototype

  This is a code bundle for Thermomix Recipe Prototype. The original project is available at https://www.figma.com/design/ufnBAnvTAJFK2AOMyPoQof/Thermomix-Recipe-Prototype.

  ## Running the code

  Run `npm i` to install the dependencies.

  Set your Google AI API key (recommended):

  `export GOOGLE_API_KEY="your_key_here"`

  If you want users to store their own Gemini API keys securely:

  `export AI_CONFIG_ENCRYPTION_KEY="a_long_random_secret"`

  Optional fallback:

  `export OPENAI_API_KEY="your_key_here"`

  Run `npm run dev` to start the development server.

  ## Supabase

  This project now supports Supabase as primary catalog/progress backend.
  For setup and direct cutover from Google Sheets, see:

  - `README-SUPABASE.md`

  ## AI Recipe Creator

  On the first screen ("Elige tu misión"), use **Crear nueva receta con IA**.
  Write the dish idea and click **Agregar receta con IA**.
  The generated recipe is added directly to the app and can be cooked immediately.

  Authenticated users can also open **Ajustes IA** to:
  - switch between the platform key and their own Gemini key
  - validate and store a personal API key server-side
  - review token usage and app-level token limits

  ## AI Mock Mode

  For local UI testing without consuming IA credits, you can enable:

  `export VITE_AI_MOCK_MODE="true"`

  In development, the AI wizard will also expose temporary test actions like:
  - `Cargar ejemplo Milanesa`
  - `Saltar a refinamiento`
  - `Generar receta mock`

  You can also type keywords like `milanesa` to trigger local mock data instead of calling the IA backend.
  
