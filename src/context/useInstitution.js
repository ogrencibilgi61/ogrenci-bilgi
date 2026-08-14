import { useContext } from 'react'
import { InstitutionContext } from './institutionContext'

export function useInstitution() {
  const context = useContext(InstitutionContext)

  if (!context) {
    throw new Error('useInstitution must be used inside InstitutionProvider')
  }

  return context
}
