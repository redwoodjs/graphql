import UserCell from 'src/components/User/UserCell'

type UserPageProps = {
  id: number
}

const UserPage = ({ id }: UserPageProps) => {
  return <UserCell id={id} />
}

export default UserPage
