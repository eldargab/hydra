import express from 'express'
import { Server } from 'http'
import { register, validateMetricName } from 'prom-client'
import { getConfig as conf } from '../start/config'
import { info } from '../util/log'

export function startPromEndpoint(): Server {
  const server = express()

  // Setup server to Prometheus scrapes:
  server.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  })

  server.get('/metrics/:metricName', async (req, res) => {
    res.set('Content-Type', register.contentType)
    if (
      !req.params.metricName ||
      !validateMetricName(req.params.metricName)
    ) {
      res.status(400).end('No requested metric found')
    }
    res.end(await register.getSingleMetricAsString(req.params.metricName))
  })

  const port = conf().PROMETHEUS_PORT
  const app = server.listen(port)
  info(
    `Prometheus server is listening on port ${port}. Hydra-Processor metrics are available at localhost:${port}/metrics`
  )
  return app
}
