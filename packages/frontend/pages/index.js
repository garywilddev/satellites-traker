import { useState } from 'react'
import { gql, useQuery, useLazyQuery } from '@apollo/client'
import Head from 'next/head'
import Grid from '@material-ui/core/Grid'
import styles from '../styles/Home.module.css'
import SatelliteInfoList from '../components/SatelliteInfoList'
import SatellitePositionMap from '../components/SatellitePositionMap'
import { OBSERVER_LAT, OBSERVER_LNG, OBSERVER_ALT } from '../constants'
import { initializeApollo } from '../lib/apolloClient'

export const ALL_SATELLITES = gql`
  query allSatellites {
    satellites: allSatellites {
      id
      name
      meanMotion
    }
  }
`

const ALL_POSITIONS = gql`
  query allPositions(
    $ids: [ID!]!
    $observerLat: Float!
    $observerLng: Float!
    $observerAlt: Float!
  ) {
    positions: allPositions(
      ids: $ids
      observerLat: $observerLat
      observerLng: $observerLng
      observerAlt: $observerAlt
    ) {
      id
      name
      time
      lat
      lng
      alt
    }
  }
`

export default function Home() {
  const [count, setCount] = useState(0)

  const {
    loading: satellitesLoading,
    error: satellitesError,
    data: satellitesData,
  } = useQuery(ALL_SATELLITES)

  const [
    getPositions,
    {
      loading: positionsLoading,
      error: positionsError,
      data: positionsData,
      refetch: refetchPositions,
    },
  ] = useLazyQuery(ALL_POSITIONS, {
    variables: {
      ids: satellitesData.satellites.map(({ id }) => id),
      observerLat: OBSERVER_LAT,
      observerLng: OBSERVER_LNG,
      observerAlt: OBSERVER_ALT,
    },
    notifyOnNetworkStatusChange: true,
  })

  function handleOnClick() {
    count === 0 ? getPositions() : refetchPositions()
    setCount(count + 1)
  }

  // Sort satellites info by mean motion
  let infos = [...satellitesData.satellites].sort(
    (a, b) => a.meanMotion - b.meanMotion,
  )

  // Attribute a position to a satellite when positions are available
  if (positionsData && positionsData.positions) {
    infos = infos.map(info => ({
      ...info,
      ...positionsData.positions.find(({ id }) => id === info.id),
    }))
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Satellites Viewer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Grid
          container
          direction="row"
          justify="center"
          alignItems="center"
          spacing={3}
        >
          <h1 className={styles.title}>🚀 Welcome to Satellites Tracker 🚀</h1>
          <Grid item xs={12} container justify="center" alignItems="center">
            <button
              type="submit"
              onClick={() => {
                handleOnClick()
              }}
            >
              Get Satellites Positions
            </button>
          </Grid>
          <Grid item xs={6}>
            {infos && (
              <SatelliteInfoList
                satellitesLoading={satellitesLoading}
                satellitesError={satellitesError}
                satellitesInfos={infos}
                arePositionsAvailable={!!positionsData}
                positionsLoading={positionsLoading}
              />
            )}
            {positionsError && <div>`failed to load: {positionsError}`</div>}
          </Grid>

          {positionsData && (
            <Grid item xs={12} container justify="center" alignItems="center">
              <SatellitePositionMap positions={infos} />
            </Grid>
          )}
        </Grid>
      </main>
      <footer className={styles.footer}>
        <p>
          {'Made with '}
          <span className={styles.love} />
          {' by '}
          <a href="https://github.com/garywilddev">Gary</a>
        </p>
      </footer>
    </div>
  )
}

export async function getStaticProps() {
  const apolloClient = initializeApollo()

  await apolloClient.query({
    query: ALL_SATELLITES,
  })

  return {
    props: {
      initialApolloState: apolloClient.cache.extract(),
    },
    revalidate: 1,
  }
}
