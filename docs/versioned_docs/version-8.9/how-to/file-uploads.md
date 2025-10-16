# File Uploads

As you've probably heard, Redwood thinks the future is serverless. This concept introduces some interesting problems you might not have had to worry about in the past. For example, where do files go when you upload them? There's no server! Like many tasks you may have done [yourself](tutorial/chapter4/authentication.md) in the past, this is another job that we can farm out to a third-party service.

## The Service

There are many services out there that handle uploading files and serving them from a CDN. Two of the big ones are [Cloudinary](https://cloudinary.com) and [Filestack](https://filestack.com). We're going to demo a Filestack integration here because we've found it easy to integrate. In addition to storing your uploads and making them available via a CDN, they also offer on-the-fly image transformations so that even if someone uploads a Retina-ready 5000px wide headshot, you can shrink it down and only serve a 100px version for their avatar in the upper right corner of your site. You save bandwidth and transfer costs.

We're going to sign up for a free plan which gives us 100 uploads a month, 1000 transformations (like resizing an image), 1GB of bandwidth, and 0.5GB of storage. That's more than enough for this demo. (And maybe even a low-traffic production site!)

Head over to https://dev.filestack.com/signup/free/ and sign up. Be sure to use a real email address because they're going to send you a confirmation email before they let you log in. Once you verify your email, you'll be dropped on your dashboard where your API key will be shown in the upper right:

![New image scaffold](https://user-images.githubusercontent.com/300/82616735-ec41a400-9b82-11ea-9566-f96089e35e52.png)

Copy that (or at least keep the tab open) because we're going to need it in a minute. (I already changed that key so don't bother trying to steal it!)

That's it on the Filestack side; on to the application.

## The App

Let's create a very simple DAM (Digital Asset Manager) that lets users upload and catalogue images. They'll be able to click the thumbnail to open a full-size version.

Create a new Redwood app:

```bash
yarn create redwood-app uploader
cd uploader
```

The first thing we'll do is create an environment variable to hold our Filestack API key. This is a best practice so that the key isn't living in our repository for prying eyes to see. Add the key to the `.env` file in the root of our app:

```bash
REDWOOD_ENV_FILESTACK_API_KEY=AM18i8xV4QpoiGwetoTWd
```

> We're prefixing with `REDWOOD_ENV_` here to tell Vite that we want it to replace this variables with its actual value as it's processing pages and statically generating them. Otherwise our generated pages would still contain something like `process.env.FILESTACK_API_KEY`, which wouldn't exist when the pages are static and being served from a CDN.

Now we can start our development server:

```bash
yarn rw dev
```

### The Database

We'll create a single model to store our image data:

```javascript title="api/db/schema.prisma"
model Image {
  id    Int    @id @default(autoincrement())
  title String
  url   String
}
```

`title` will be the user-supplied name for this asset and `url` will contain the public URL that Filestack creates after an upload.

Create a migration to update the database; when prompted, name it "add image":

```bash
yarn rw prisma migrate dev
```

To make our lives easier, let's scaffold the screens necessary to create/update/delete an image, then we'll worry about adding the uploader:

```bash
yarn rw generate scaffold image
```

Now head to http://localhost:8910/images/new and let's figure this out!

![New image scaffold](https://user-images.githubusercontent.com/300/82694608-653f0b00-9c18-11ea-8003-4dc4aeac7b86.png)

## The Uploader

Filestack has a couple of [React components](https://github.com/filestack/filestack-react) that handle all the uploading for us. Let's add the package:

```bash
yarn workspace web add filestack-react
```

We want the uploader on our scaffolded form, so let's head over to `ImageForm`, import Filestack's inline picker, and try replacing the **Url** input with it:

```jsx {9,49} title="web/src/components/ImageForm/ImageForm.js"
import {
  Form,
  FormError,
  FieldError,
  Label,
  TextField,
  Submit,
} from '@redwoodjs/forms'
import { PickerInline } from 'filestack-react'

const formatDatetime = (value) => {
  if (value) {
    return value.replace(/:\d{2}\.\d{3}\w/, '')
  }
}

const ImageForm = (props) => {
  const onSubmit = (data) => {
    props.onSave(data, props?.image?.id)
  }

  return (
    <div className="rw-form-wrapper">
      <Form onSubmit={onSubmit} error={props.error}>
        <FormError
          error={props.error}
          wrapperClassName="rw-form-error-wrapper"
          titleClassName="rw-form-error-title"
          listClassName="rw-form-error-list"
        />

        <Label
          name="title"
          className="rw-label"
          errorClassName="rw-label rw-label-error"
        >
          Title
        </Label>
        <TextField
          name="title"
          defaultValue={props.image?.title}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="title" className="rw-field-error" />

        <PickerInline apikey={process.env.REDWOOD_ENV_FILESTACK_API_KEY} />

        <div className="rw-button-group">
          <Submit disabled={props.loading} className="rw-button rw-button-blue">
            Save
          </Submit>
        </div>
      </Form>
    </div>
  )
}

export default ImageForm
```

We now have a picker with all kinds of options, like picking a local file, providing a URL, and even grabbing a file from Facebook, Instagram, or Google Drive. Not bad!

![Filestack picker](https://user-images.githubusercontent.com/32992335/133859676-4086a4b9-8112-4a19-a4fe-5663388aafc0.png)

You can even try uploading an image to make sure it works:

![Upload](https://user-images.githubusercontent.com/300/82618035-bb636e00-9b86-11ea-9401-61b8c989f43c.png)

> Make sure you click the **Upload** button that appears after picking your file.

If you go over to the Filestack dashboard, you'll see that we've uploaded an image:

![Filestack dashboard](https://user-images.githubusercontent.com/300/82618057-ccac7a80-9b86-11ea-9cd8-7a9e80a5a20f.png)

But that doesn't help us attach anything to our database record. Let's do that.

## The Data

Let's see what's going on when an upload completes. The Filestack picker takes an `onSuccess` prop with a function to call when complete:

```jsx {8-10,16} title="web/src/components/ImageForm/ImageForm.js"
// imports and stuff...

const ImageForm = (props) => {
  const onSubmit = (data) => {
    props.onSave(data, props?.image?.id)
  }

  const onFileUpload = (response) => {
    console.info(response)
  }

  // form stuff...

  <PickerInline
    apikey={process.env.REDWOOD_ENV_FILESTACK_API_KEY}
    onSuccess={onFileUpload}
  />
```

Well lookie here:

![Uploader response](https://user-images.githubusercontent.com/300/82618071-ddf58700-9b86-11ea-9626-e093b4c8d853.png)

`filesUploaded[0].url` seems to be exactly what we need—the public URL to the image that was just uploaded. Excellent! How about we use a little state to track that for us so it's available when we submit our form:

```jsx {10,19,26} title="web/src/components/ImageForm/ImageForm.js"
import {
  Form,
  FormError,
  FieldError,
  Label,
  TextField,
  Submit,
} from '@redwoodjs/forms'
import { PickerInline } from 'filestack-react'
import { useState } from 'react'

const formatDatetime = (value) => {
  if (value) {
    return value.replace(/:\d{2}\.\d{3}\w/, '')
  }
}

const ImageForm = (props) => {
  const [url, setUrl] = useState(props?.image?.url)

  const onSubmit = (data) => {
    props.onSave(data, props?.image?.id)
  }

  const onFileUpload = (response) => {
    setUrl(response.filesUploaded[0].url)
  }

  return (
    // component stuff...
```

So we'll use `setState` to store the URL for the image. We default it to the existing `url` value, if it exists—remember that scaffolds use this same form for editing of existing records, where we'll already have a value for `url`. If we didn't store that url value somewhere then it would be overridden with `null` if we started editing an existing record!

The last thing we need to do is set the value of `url` in the `data` object before it gets passed to the `onSave` handler:

```jsx {2,3} title="web/src/components/ImageForm/ImageForm.js"
const onSubmit = (data) => {
  const dataWithUrl = Object.assign(data, { url })
  props.onSave(dataWithUrl, props?.image?.id)
}
```

Now try uploading a file and saving the form:

![Upload done](https://user-images.githubusercontent.com/300/82702493-f5844c80-9c26-11ea-8fc4-0273b92034e4.png)

It worked! Next let's update the display here to actually show the image as a thumbnail and make it clickable to see the full version:

```jsx {76-78} title="web/src/components/Images/Images.js"
import { useMutation } from '@redwoodjs/web'
import { toast } from '@redwoodjs/web/toast'
import { Link, routes } from '@redwoodjs/router'

import { QUERY } from 'src/components/Image/ImagesCell'

const DELETE_IMAGE_MUTATION = gql`
  mutation DeleteImageMutation($id: Int!) {
    deleteImage(id: $id) {
      id
    }
  }
`

const MAX_STRING_LENGTH = 150

const truncate = (text) => {
  let output = text
  if (text && text.length > MAX_STRING_LENGTH) {
    output = output.substring(0, MAX_STRING_LENGTH) + '...'
  }
  return output
}

const jsonTruncate = (obj) => {
  return truncate(JSON.stringify(obj, null, 2))
}

const timeTag = (datetime) => {
  return (
    <time dateTime={datetime} title={datetime}>
      {new Date(datetime).toUTCString()}
    </time>
  )
}

const checkboxInputTag = (checked) => {
  return <input type="checkbox" checked={checked} disabled />
}

const ImagesList = ({ images }) => {
  const [deleteImage] = useMutation(DELETE_IMAGE_MUTATION, {
    onCompleted: () => {
      toast.success('Image deleted')
    },
    // This refetches the query on the list page. Read more about other ways to
    // update the cache over here:
    // https://www.apollographql.com/docs/react/data/mutations/#making-all-other-cache-updates
    refetchQueries: [{ query: QUERY }],
    awaitRefetchQueries: true,
  })

  const onDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete image ' + id + '?')) {
      deleteImage({ variables: { id } })
    }
  }

  return (
    <div className="rw-segment rw-table-wrapper-responsive">
      <table className="rw-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Title</th>
            <th>Url</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {images.map((image) => (
            <tr key={image.id}>
              <td>{truncate(image.id)}</td>
              <td>{truncate(image.title)}</td>
              <td>
                <a href={image.url} target="_blank">
                  <img src={image.url} style={{ maxWidth: '50px' }} />
                </a>
              </td>
              <td>
                <nav className="rw-table-actions">
                  <Link
                    to={routes.image({ id: image.id })}
                    title={'Show image ' + image.id + ' detail'}
                    className="rw-button rw-button-small"
                  >
                    Show
                  </Link>
                  <Link
                    to={routes.editImage({ id: image.id })}
                    title={'Edit image ' + image.id}
                    className="rw-button rw-button-small rw-button-blue"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    title={'Delete image ' + image.id}
                    className="rw-button rw-button-small rw-button-red"
                    onClick={() => onDeleteClick(image.id)}
                  >
                    Delete
                  </button>
                </nav>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ImagesList
```

![Image](https://user-images.githubusercontent.com/300/82702575-1fd60a00-9c27-11ea-8d2f-047bcf4e9cae.png)

## The Transform

Remember when we mentioned that Filestack can save you bandwidth by transforming images on the fly? This page is a perfect example—the image is never bigger than 50px, why pull down the full resolution just for that tiny display? Here's how we can tell Filestack that whenever we grab this instance of the image, it only needs to be 100px.

Why 100px? Most phones and many laptops and desktop displays are now 4k or larger. Images are actually displayed at at least double resolution on these displays, so even though it's "50px", it's really 100px when shown on these displays. So you'll usually want to bring down all images at twice their intended display resolution.

We need to add a special indicator to the URL itself to trigger the transform so let's add a function that does that for a given image URL (this can go either inside or outside of the component definition):

```jsx title="web/src/components/Images/Images.js"
const thumbnail = (url) => {
  const parts = url.split('/')
  parts.splice(3, 0, 'resize=width:100')
  return parts.join('/')
}
```

What this does is turn a URL like

```
https://cdn.filestackcontent.com/81m7qIrURxSp7WHcft9a
```

into

```
https://cdn.filestackcontent.com/resize=width:100/81m7qIrURxSp7WHcft9a
```

Now we'll use the result of that function in the `<img>` tag:

```jsx title="web/src/components/Images/Images.js"
<img src={thumbnail(image.url)} style={{ maxWidth: '50px' }} />
```

Starting with an uploaded image of 157kB, the 100px thumbnail clocks in at only 6.5kB! Optimizing image delivery is almost always worth the extra effort!

You can read more about the available transforms at [Filestack's API reference](https://www.filestack.com/docs/api/processing/).

## The Improvements

It'd be nice if, after uploading, you could see the image you uploaded. Likewise, when editing an image, it'd be helpful to see what's already attached. Let's make those improvements now.

We're already storing the attached image URL in state, so let's use the existence of that state to show the attached image. In fact, let's also hide the uploader and assume you're done (you'll be able to show it again if needed):

```jsx {5,8} title="web/src/components/ImageForm/ImageForm.js"
<PickerInline
  apikey={process.env.REDWOOD_ENV_FILESTACK_API_KEY}
  onSuccess={onFileUpload}
>
  <div style={{ display: url ? 'none' : 'block', height: '500px' }}></div>
</PickerInline>

{url && <img src={url} style={{ marginTop: '2rem' }} />}
```

Now if you create a new image record, you'll see the picker, and as soon as the upload is complete, the uploaded image will pop into place. If you go to edit an image, you'll see the file that's already attached.

> You should probably use the same resize-URL trick here to make sure it doesn't try to display a 10MB image immediately after uploading it. A max width of 500px may be good...

Now let's add the ability to bring back the uploader if you decide you want to change the image. We can do that by clearing the image that's in state:

```jsx {8-18} title="web/src/components/ImageForm/ImageForm.js"
<PickerInline
  apikey={process.env.REDWOOD_ENV_FILESTACK_API_KEY}
  onSuccess={onFileUpload}
>
  <div style={{ display: url ? 'none' : 'block', height: '500px' }}></div>
</PickerInline>

{url && (
  <div>
    <img src={url} style={{ display: 'block', margin: '2rem 0' }} />
    <button
      onClick={() => setUrl(null)}
      className="rw-button rw-button-blue"
    >
      Replace Image
    </button>
  </div>
)}
```

![Replace image button](https://user-images.githubusercontent.com/300/82719274-e7055780-9c5d-11ea-9a8a-8c1c72185983.png)

We're borrowing the styles from the submit button and making sure that the image has both a top and bottom margin so it doesn't crash into the new button.

## The Delete

Having a free plan is great, but if you just load images and never actually remove the unnecessary ones, you'll be in trouble.

To avoid this, we'd better implement the `deleteImage` mutation. It will enable you to make a call to the Filestack API to remove your resources and, on success, remove the row in the `Image` model.

You are going to need a new ENV var called `REDWOOD_ENV_FILESTACK_SECRET`, which you can find in **Filestack > Security > Policy & Signature:** App Secret. Put this into your `.env` file (don't use this one of course, paste your own in there):

```dotenv title=".env"
REDWOOD_ENV_FILESTACK_SECRET= PWRWGEKFZ2HJMXWSBP3YYI5ERZ
```

Filestack's library will provide a `getSecurity` method that will allow us to delete a resource, but only if executed on a **nodejs** environment. Hence, we need to execute the `delete` operation on the `api` side.

Let's add the proper package:

```shell
yarn workspace api add filestack-js
```

Great. Now we can modify our service accordingly:

```js {4-23} title="api/src/services/image/image.ts"
import * as Filestack from 'filestack-js'

export const deleteImage = async ({ id }) => {
  const client = Filestack.init(process.env.REDWOOD_ENV_FILESTACK_API_KEY)

  const image = await db.image.findUnique({ where: { id } })

  // The `security.handle` is the unique part of the Filestack file's url.
  const handle = image.url.split('/').pop()

  const security = Filestack.getSecurity(
    {
      // We set `expiry` at `now() + 5 minutes`.
      expiry: new Date().getTime() + 5 * 60 * 1000,
      handle,
      call: ['remove'],
    },
    process.env.REDWOOD_ENV_FILESTACK_SECRET
  )

  await client.remove(handle, security)

  return db.image.delete({ where: { id } })
}
```

Great! Now when you click the button in the frontend, the service will make a call to Filestack to remove the image from the service first. We set `expiry` to 20 seconds so that our policy expires 20 seconds after its generation, this is more than enough to protect your access while executing such operation.

Assuming the request to `remove()` the image succeeded, we then delete it locally. If you wanted to be extra safe you could surround the `remove()` call with a try/catch block and then throw your own error if Filestack ends up throwing an error.

## The Wrap-up

Files uploaded!

There's plenty of ways to integrate a file picker. This is just one, but we think it's simple, yet flexible. We use the same technique on the [example-blog](https://github.com/redwoodjs/example-blog).

Have fun and get uploading!
