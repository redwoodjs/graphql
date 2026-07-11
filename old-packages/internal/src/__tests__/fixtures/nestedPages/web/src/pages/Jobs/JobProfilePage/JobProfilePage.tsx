import { Metadata } from '@redwoodjs/web'
import JobProfileCell from 'src/components/Jobs/JobProfileCell'

const JobProfilePage = ({ id }) => {
  return (
    <>
      <Metadata
        title="Job Profile"
        description="RedwoodJS devs available for work"
      />

      <JobProfileCell id={id} />
    </>
  )
}

export default JobProfilePage
