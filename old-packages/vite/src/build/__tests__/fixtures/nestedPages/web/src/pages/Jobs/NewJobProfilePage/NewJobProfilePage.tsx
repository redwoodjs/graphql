import { useEffect } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { Metadata, useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'

import JobProfileForm from 'src/components/Jobs/JobProfileForm'

const CREATE_JOB_PROFILE = gql`
  mutation CreateJobProfileMutation($input: CreateJobProfileInput!) {
    createJobProfile(input: $input) {
      id
    }
  }
`

const NewJobProfilePage = () => {
  const [createJobProfile, { loading, error }] = useMutation(
    CREATE_JOB_PROFILE,
    {
      onCompleted: ({ createJobProfile }) => {
        toast.success('Job profile created!', { id: 'saving' })
        navigate(routes.jobProfile({ id: createJobProfile.id }))
      },
    }
  )

  useEffect(() => {
    if (error) {
      toast.error(error.message, { id: 'saving' })
    }
  }, [error])

  const createJobProfileWithMessage = (args) => {
    toast.loading('Saving profile...', { id: 'saving' })
    createJobProfile(args)
  }

  return (
    <>
      <Metadata
        title="Post a Job"
        description="Looking to hire RedwoodJS developers? Post on the Redwood job board!"
      />

      <div className="max-w-screen-lg mx-auto job">
        <header className="mt-36">
          <h1 className="relative text-6xl px-16 text-teal-800 tracking-normal text-center">
            Post Your Profile
          </h1>
          <div className="mt-2 text-center text-stone-500">
            Get in front of hirers and land your next RedwoodJS role
          </div>
        </header>

        <JobProfileForm
          loading={loading}
          error={error}
          saveFunc={createJobProfileWithMessage}
        />
      </div>
    </>
  )
}

export default NewJobProfilePage
