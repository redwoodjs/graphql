import { Metadata } from '@redwoodjs/web'


const CREATE_JOB = gql`
  mutation CreateJobMutation($input: CreateJobInput!) {
    createJob(input: $input) {
      id
    }
  }
`

const NewJobPage = ({ token }) => {
  return (
    <>
      <Metadata
        title="Post a Job"
        description="Looking to hire RedwoodJS developers? Post on the Redwood job board!"
      />

      <div className="max-w-screen-lg mx-auto job">
        <header className="mt-36">
          <h1 className="relative text-6xl px-16 text-teal-800 tracking-normal text-center">
            Post a Job
          </h1>
          <div className="mt-2 text-center text-stone-500">
            Get your job in front of the best RedwoodJS devs
          </div>
        </header>
      </div>
    </>
  )
}

export default NewJobPage
