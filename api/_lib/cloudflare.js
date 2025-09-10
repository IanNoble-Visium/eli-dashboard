import { request, gql } from 'graphql-request'

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID

export function isCloudflareConfigured() {
  return Boolean(CF_TOKEN && CF_ACCOUNT_ID)
}

export async function fetchCloudflareAnalytics({ sinceISO }) {
  if (!isCloudflareConfigured()) {
    return { enabled: false, data: { requests: [], threats: [] } }
  }
  const endpoint = 'https://api.cloudflare.com/client/v4/graphql'
  const headers = { Authorization: `Bearer ${CF_TOKEN}` }

  const query = gql`
    query ($accountTag: String!, $since: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          httpRequests1mGroups(limit: 120, filter: { datetime_geq: $since }) {
            sum { requests threats } datetimeMinute: dimensions { datetime }
          }
        }
      }
    }
  `

  try {
    const data = await request({ url: endpoint, document: query, requestHeaders: headers, variables: { accountTag: CF_ACCOUNT_ID, since: sinceISO } })
    const groups = data?.viewer?.accounts?.[0]?.httpRequests1mGroups || []
    const series = groups.map(g => ({ t: g.datetimeMinute?.datetime, requests: g.sum?.requests || 0, threats: g.sum?.threats || 0 }))
    return { enabled: true, data: { series } }
  } catch (err) {
    console.error('[cloudflare] analytics error', err)
    return { enabled: true, data: { series: [] }, warning: 'Cloudflare fetch failed' }
  }
}

