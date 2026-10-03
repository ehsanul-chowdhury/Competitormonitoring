import { NestFactory } from "@nestjs/core"
import helmet from "helmet"

import { AppModule } from "./app.module.js"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(helmet())
  const port = process.env.PORT ?? 4000
  await app.listen(port)
  console.log(`IntelFlock API listening on http://localhost:${port}`)
}
await bootstrap()
