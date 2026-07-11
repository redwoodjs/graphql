import { Metadata } from '@redwoodjs/web'
import JobCell from 'src/components/Jobs/JobCell'

const JobPage = ({ id }) => {
  return (
    <>
      <Metadata
        title="Job"
        description="Job opening for RedwoodJS developers"
      />

      <JobCell id={id} />
    </>
  )
}

export default JobPage
