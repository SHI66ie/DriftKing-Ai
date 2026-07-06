// OpenF1 API Integration
// Modern F1 data API starting from 2023 season
// Documentation: https://openf1.org/

const OPENF1_BASE_URL = 'https://api.openf1.org/v1'

export interface OpenF1Driver {
    driver_number: number
    broadcast_name: string
    full_name: string
    name_acronym: string
    team_name: string
    team_colour: string
    first_name: string
    last_name: string
    headshot_url: string
    country_code: string
}

export interface OpenF1Session {
    session_key: number
    session_name: string
    session_type: string
    date_start: string
    date_end: string
    location: string
    country_name: string
    circuit_short_name: string
}

export interface OpenF1ChampionshipDriver {
    session_key: number
    driver_number: number
    position: number
    points: number
}

export interface OpenF1CarData {
    driver_number: number
    date: string
    rpm: number
    speed: number
    n_gear: number
    throttle: number
    brake: number
    drs: number
    meeting_key: number
    session_key: number
}

export interface OpenF1LapData {
    driver_number: number
    lap_number: number
    lap_duration: number
    date_start: string
    duration_sector_1: number
    duration_sector_2: number
    duration_sector_3: number
    i1_speed: number
    i2_speed: number
    st_speed: number
    is_pit_out_lap: boolean
    meeting_key: number
    session_key: number
}

export interface OpenF1WeatherData {
    date: string
    air_temperature: number
    track_temperature: number
    humidity: number
    pressure: number
    wind_speed: number
    wind_direction: number
    rainfall: number
    meeting_key: number
    session_key: number
}

export interface OpenF1StintData {
    driver_number: number
    lap_start: number
    lap_end: number
    compound: string
    tyre_age_at_start: number
    stint_number: number
    session_key: number
    meeting_key: number
}

export interface OpenF1LocationData {
    driver_number: number
    date: string
    x: number
    y: number
    z: number
    session_key: number
    meeting_key: number
}

async function openf1Fetch<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const query = new URLSearchParams(params).toString()
    const url = `${OPENF1_BASE_URL}${endpoint}${query ? `?${query}` : ''}`

    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
        throw new Error(`OpenF1 API request failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
}

export const openf1Api = {
    // Get drivers for a specific session or latest
    async getDrivers(sessionKey?: number): Promise<OpenF1Driver[]> {
        const params = sessionKey ? { session_key: sessionKey } : {}
        return await openf1Fetch<OpenF1Driver[]>('/drivers', params)
    },

    // Get sessions (races, qualifying, etc.)
    async getSessions(year?: number): Promise<OpenF1Session[]> {
        const params = year ? { year } : {}
        return await openf1Fetch<OpenF1Session[]>('/sessions', params)
    },

    // Get championship standings for drivers
    async getDriverStandings(sessionKey: number): Promise<OpenF1ChampionshipDriver[]> {
        return await openf1Fetch<OpenF1ChampionshipDriver[]>('/championship_drivers', { session_key: sessionKey })
    },

    // Get latest session
    async getLatestSession(): Promise<OpenF1Session[]> {
        return await openf1Fetch<OpenF1Session[]>('/sessions', { session_key: 'latest' })
    },

    // Get laps for a specific session (useful for practice/testing analysis)
    async getLaps(sessionKey: number, driverNumber?: number): Promise<any[]> {
        const params: any = { session_key: sessionKey }
        if (driverNumber) params.driver_number = driverNumber
        return await openf1Fetch<any[]>('/laps', params)
    },

    // Get car telemetry data (speed, throttle, brake, gears, etc.)
    async getCarData(sessionKey: number, driverNumber?: number, minSpeed?: number): Promise<OpenF1CarData[]> {
        const params: any = { session_key: sessionKey }
        if (driverNumber) params.driver_number = driverNumber
        if (minSpeed) params[`speed>=${minSpeed}`] = ''
        return await openf1Fetch<OpenF1CarData[]>('/car_data', params)
    },

    // Get weather data for a session
    async getWeatherData(sessionKey: number): Promise<OpenF1WeatherData[]> {
        return await openf1Fetch<OpenF1WeatherData[]>('/weather', { session_key: sessionKey })
    },

    // Get position data for drivers during a session
    async getPositionData(sessionKey: number, driverNumber?: number): Promise<any[]> {
        const params: any = { session_key: sessionKey }
        if (driverNumber) params.driver_number = driverNumber
        return await openf1Fetch<any[]>('/position', params)
    },

    // Get pit stop data
    async getPitData(sessionKey: number, driverNumber?: number): Promise<any[]> {
        const params: any = { session_key: sessionKey }
        if (driverNumber) params.driver_number = driverNumber
        return await openf1Fetch<any[]>('/pit', params)
    },

    // Get race control messages (safety cars, flags, etc.)
    async getRaceControlData(sessionKey: number): Promise<any[]> {
        return await openf1Fetch<any[]>('/race_control', { session_key: sessionKey })
    },

    // Get stints data for tire strategy
    async getStints(sessionKey: number, driverNumber?: number): Promise<OpenF1StintData[]> {
        const params: any = { session_key: sessionKey }
        if (driverNumber) params.driver_number = driverNumber
        return await openf1Fetch<OpenF1StintData[]>('/stints', params)
    },

    // Get track position (x, y, z) location data
    async getLocation(sessionKey: number, driverNumber?: number): Promise<OpenF1LocationData[]> {
        const params: any = { session_key: sessionKey }
        if (driverNumber) params.driver_number = driverNumber
        return await openf1Fetch<OpenF1LocationData[]>('/location', params)
    }
}


export const transformOpenF1Data = {
    driver(d: OpenF1Driver): any {
        return {
            id: d.driver_number.toString(),
            name: d.full_name,
            code: d.name_acronym,
            number: d.driver_number.toString(),
            team: d.team_name,
            color: `#${d.team_colour}`,
            image: d.headshot_url
        }
    },

    session(s: OpenF1Session): any {
        return {
            id: s.session_key.toString(),
            name: s.session_name,
            type: s.session_type,
            location: s.location,
            country: s.country_name,
            circuit: s.circuit_short_name,
            date: s.date_start
        }
    },

    standing(s: OpenF1ChampionshipDriver, drivers: OpenF1Driver[]): any {
        const driver = drivers.find(d => d.driver_number === s.driver_number)
        return {
            position: s.position,
            points: s.points,
            driver: driver ? transformOpenF1Data.driver(driver) : { name: `Driver #${s.driver_number}` },
            team: driver ? { name: driver.team_name } : { name: 'Unknown' }
        }
    },

    carData(data: OpenF1CarData[]): any[] {
        return data.map(point => ({
            timestamp: new Date(point.date).getTime(),
            speed: point.speed,
            rpm: point.rpm,
            gear: point.n_gear,
            throttle: point.throttle,
            brake: point.brake,
            drs: point.drs
        }))
    },

    lapData(data: OpenF1LapData[]): any[] {
        return data.map(lap => ({
            lapNumber: lap.lap_number,
            lapTime: lap.lap_duration,
            sector1Time: lap.duration_sector_1,
            sector2Time: lap.duration_sector_2,
            sector3Time: lap.duration_sector_3,
            speedTrap: lap.st_speed,
            speedI1: lap.i1_speed,
            speedI2: lap.i2_speed,
            isPitOutLap: lap.is_pit_out_lap,
            date: lap.date_start
        }))
    },

    weatherData(data: OpenF1WeatherData[]): any[] {
        return data.map(point => ({
            timestamp: new Date(point.date).getTime(),
            airTemp: point.air_temperature,
            trackTemp: point.track_temperature,
            humidity: point.humidity,
            pressure: point.pressure,
            windSpeed: point.wind_speed,
            windDirection: point.wind_direction,
            rainfall: point.rainfall
        }))
    }
}
