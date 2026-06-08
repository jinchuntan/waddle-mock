import { createContext, useContext, useState } from 'react'

export const LOCATIONS = {
  MY: {
    key: 'MY',
    label: 'Malaysia',
    flag: '🇲🇾',
    currency: 'MYR',
    searchInstruction:
      'Only return products and suppliers located in Malaysia. ' +
      'Prioritise Malaysian suppliers, local distributors, and prices quoted in Malaysian Ringgit (MYR). ' +
      'Exclude results from other countries.',
  },
  SG: {
    key: 'SG',
    label: 'Singapore',
    flag: '🇸🇬',
    currency: 'SGD',
    searchInstruction:
      'Only return products and suppliers located in Singapore. ' +
      'Prioritise Singaporean suppliers, local distributors, and prices quoted in Singapore Dollars (SGD). ' +
      'Exclude results from other countries.',
  },
}

const LocationContext = createContext(null)

export function LocationProvider({ children }) {
  const [locationKey, setLocationKey] = useState('MY')
  const location = LOCATIONS[locationKey]

  return (
    <LocationContext.Provider value={{ locationKey, setLocationKey, location }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used inside <LocationProvider>')
  return ctx
}
