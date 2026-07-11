import React from 'react'

import {
  screen,
  render,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, afterEach } from 'vitest'

import {
  Form,
  TextField,
  NumberField,
  CheckboxField,
  TextAreaField,
  DatetimeLocalField,
  DateField,
  SelectField,
  Submit,
  FieldError,
  Label,
} from '../index'

describe('Form', () => {
  const TestComponent = ({ onSubmit = () => {} }) => {
    return (
      <Form onSubmit={onSubmit}>
        <TextField name="text" defaultValue="text" />
        <NumberField name="number" defaultValue="42" />
        <TextField
          name="floatText"
          defaultValue="3.14"
          validation={{ valueAsNumber: true }}
        />
        <CheckboxField name="checkbox" defaultChecked={true} />
        <TextAreaField
          name="json"
          defaultValue={`
            {
              "key_one": "value1",
              "key_two": 2,
              "false": false
            }
          `}
          validation={{ valueAsJSON: true }}
        />
        <DatetimeLocalField
          name="datetimeLocal"
          defaultValue="2021-04-16T12:34"
        />
        <DateField name="date" defaultValue="2021-04-16" />
        <SelectField name="select1" data-testid="select1">
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </SelectField>
        <SelectField
          name="select2"
          data-testid="select2"
          validation={{ valueAsNumber: true }}
        >
          <option value={1}>Option 1</option>
          <option value={2}>Option 2</option>
          <option value={3}>Option 3</option>
        </SelectField>

        <Submit>Save</Submit>
      </Form>
    )
  }

  const NumberFieldsWrapper = () => (
    <div>
      <h4>This is a wrapped form field header</h4>
      <div>
        <label htmlFor="wrapped-nf-1">Wrapped NumberField</label>
        <NumberField name="wrapped-nf-1" defaultValue="0101" />
      </div>
      <div>
        <label htmlFor="wrapped-nf-2">Wrapped NumberField</label>
        <NumberField name="wrapped-nf-2" defaultValue="0102" />
      </div>
    </div>
  )

  const TestComponentWithWrappedFormElements = ({ onSubmit = () => {} }) => {
    return (
      <Form onSubmit={onSubmit}>
        <p>Some text</p>
        <div className="field">
          <TextField
            name="wrapped-ff"
            defaultValue="3.14"
            validation={{ valueAsNumber: true }}
          />
        </div>
        <NumberFieldsWrapper />
        <Submit>Save</Submit>
      </Form>
    )
  }

  const TestComponentWithRef = () => {
    const inputEl = React.useRef<HTMLInputElement>(null)
    React.useEffect(() => {
      inputEl.current?.focus()
    })
    return (
      <Form>
        <TextField name="tf" defaultValue="text" ref={inputEl} />
      </Form>
    )
  }

  afterEach(() => {
    cleanup()
  })

  it('does not crash', () => {
    expect(() => render(<TestComponent />)).not.toThrow()
  })

  it('calls onSubmit', async () => {
    const mockFn = vi.fn()

    render(<TestComponent onSubmit={mockFn} />)

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
  })

  it('renders and coerces user-supplied values', async () => {
    const mockFn = vi.fn()

    render(<TestComponent onSubmit={mockFn} />)

    await userEvent.type(screen.getByDisplayValue('text'), 'text')
    await userEvent.type(screen.getByDisplayValue('42'), '24')
    await userEvent.type(screen.getByDisplayValue('3.14'), '1592')
    fireEvent.change(screen.getByTestId('select1'), {
      target: { value: 'Option 2' },
    })
    fireEvent.change(screen.getByTestId('select2'), {
      target: { value: 3 },
    })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      {
        text: 'texttext',
        number: 4224, // i.e. NOT "4224"
        floatText: 3.141592,
        select1: 'Option 2',
        select2: 3,
        checkbox: true,
        json: {
          key_one: 'value1',
          key_two: 2,
          false: false,
        },
        datetimeLocal: new Date('2021-04-16T12:34'),
        date: new Date('2021-04-16'),
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('finds nested form fields to coerce', async () => {
    const mockFn = vi.fn()

    render(<TestComponentWithWrappedFormElements onSubmit={mockFn} />)

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      { 'wrapped-ff': 3.14, 'wrapped-nf-1': 101, 'wrapped-nf-2': 102 },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('supports ref forwarding', async () => {
    render(<TestComponentWithRef />)
    const input = screen.getByDisplayValue('text')

    await waitFor(() => {
      expect(input).toHaveFocus()
    })
  })

  it('lets users pass custom coercion functions', async () => {
    const mockFn = vi.fn()
    const coercionFunctionNumber = (value: string) =>
      parseInt(value.replace('_', ''), 10)
    const coercionFunctionText = (value: string) => value.replace('_', '-')

    render(
      <Form onSubmit={mockFn}>
        <TextField
          name="tf"
          defaultValue="123_456"
          validation={{ setValueAs: coercionFunctionNumber }}
        />
        <SelectField
          name="select"
          defaultValue="Option_2"
          validation={{ setValueAs: coercionFunctionText }}
        >
          <option>Option_1</option>
          <option>Option_2</option>
        </SelectField>
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      { tf: 123456, select: 'Option-2' },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('sets the value to null for empty string on relational fields', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        {/* This is an optional relational field because the name ends with "Id"
            and it doesn't have { required: true } */}
        <TextField name="userId" defaultValue="" />
        <SelectField name="groupId" defaultValue="">
          <option value="">No group</option>
          <option value={1}>Group 1</option>
          <option value={2}>Group 2</option>
        </SelectField>
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      { userId: null, groupId: null },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('ensures required textField is enforced by validation', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField
          name="userId2"
          defaultValue=""
          validation={{ required: true }}
        />
        <FieldError name="userId2" data-testid="fieldError" />
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.submit(screen.getByText('Save'))
    await waitFor(() =>
      expect(screen.getByTestId('fieldError')).toBeInTheDocument(),
    )
    // The validation should catch and prevent the onSubmit from being called
    expect(mockFn).not.toHaveBeenCalled()
  })

  it('ensures required selectField is enforced by validation', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <SelectField
          name="groupId2"
          defaultValue=""
          validation={{ required: true }}
        >
          <option value="">No group</option>
          <option value={1}>Group 1</option>
          <option value={2}>Group 2</option>
        </SelectField>
        <FieldError name="groupId2" data-testid="fieldError" />{' '}
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.submit(screen.getByText('Save'))
    await waitFor(() =>
      expect(screen.getByTestId('fieldError')).toBeInTheDocument(),
    )

    // The validation should catch and prevent the onSubmit from being called
    expect(mockFn).not.toHaveBeenCalled()
  })

  it('handles int and float blank values gracefully', async () => {
    const mockFn = vi.fn()
    console.log('handles int and float blank values gracefully')

    render(
      <Form onSubmit={mockFn}>
        <NumberField name="int" defaultValue="" />
        <TextField
          name="float"
          defaultValue=""
          validation={{ valueAsNumber: true }}
        />
        <Submit>Save</Submit>
      </Form>,
    )
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      {
        int: NaN,
        float: NaN,
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  // Note the good JSON case is tested in an earlier test
  it('does not call the onSubmit function for a bad entry into a TextAreaField with valueAsJSON', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextAreaField
          name="jsonField"
          defaultValue="{bad-json}"
          validation={{ valueAsJSON: true }}
        />
        <FieldError name="jsonField" data-testid="fieldError" />
        <Submit>Save</Submit>
      </Form>,
    )
    fireEvent.submit(screen.getByText('Save'))
    await waitFor(() =>
      expect(screen.getByTestId('fieldError')).toBeInTheDocument(),
    )

    // The validation should catch and prevent the onSubmit from being called
    expect(mockFn).not.toHaveBeenCalled()
  })

  it('displays a FieldError for a bad entry into a TextAreaField with valueAsJSON', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextAreaField
          name="jsonField"
          defaultValue="{bad-json}"
          validation={{ valueAsJSON: true }}
        />
        <FieldError name="jsonField" data-testid="fieldError" />
        <Submit>Save</Submit>
      </Form>,
    )
    fireEvent.submit(screen.getByText('Save'))
    await waitFor(() =>
      expect(screen.getByTestId('fieldError')).toBeInTheDocument(),
    )

    // The validation should catch and prevent the onSubmit from being called
    expect(mockFn).not.toHaveBeenCalled()
  })

  it('for a FieldError with name set to path', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField
          name="phone"
          defaultValue="abcde"
          validation={{ pattern: /^[0-9]+$/i }}
        />
        <FieldError name="phone" data-testid="phoneFieldError" />
        <TextField
          name="address.street"
          data-testid="streetField"
          defaultValue="George123"
          validation={{ pattern: /^[a-zA-z]+$/i }}
          errorClassName="border-red"
        />
        <FieldError name="address.street" data-testid="streetFieldError" />
        <Submit>Save</Submit>
      </Form>,
    )
    fireEvent.submit(screen.getByText('Save'))

    await waitFor(() =>
      expect(screen.getByTestId('phoneFieldError')).toBeInTheDocument(),
    )
    // The validation should catch and prevent the onSubmit from being called
    expect(mockFn).not.toHaveBeenCalled()

    const phoneError = screen.getByTestId('phoneFieldError').textContent
    const streetError = screen.getByTestId('streetFieldError').textContent
    const streetField = screen.getByTestId('streetField')
    expect(phoneError).toEqual('phone is not formatted correctly')
    expect(streetError).toEqual('address.street is not formatted correctly')
    expect(streetField).toHaveClass('border-red', { exact: true })
  })

  it("doesn't crash on Labels without name", async () => {
    render(
      <Form>
        {/* @ts-expect-error - pretend this is a .js file */}
        <Label htmlFor="phone">Input your phone number</Label>
        <TextField
          id="phone"
          name="phone"
          defaultValue="abcde"
          validation={{ pattern: /^[0-9]+$/i }}
        />
        <FieldError name="phone" data-testid="phoneFieldError" />
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    const phoneError = await waitFor(
      () => screen.getByTestId('phoneFieldError').textContent,
    )
    expect(phoneError).toEqual('phone is not formatted correctly')
  })

  it('can handle falsy names ("false")', async () => {
    render(
      <Form>
        <TextField
          name="false"
          defaultValue="abcde"
          data-testid="phoneField"
          validation={{ pattern: /^[0-9]+$/i }}
        />
        <FieldError name="false" data-testid="phoneFieldError" />
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    const phoneError = await waitFor(
      () => screen.getByTestId('phoneFieldError').textContent,
    )
    expect(phoneError).toEqual('false is not formatted correctly')
  })

  it('can handle falsy names ("0")', async () => {
    render(
      <Form>
        <TextField
          name="0"
          defaultValue="abcde"
          validation={{ pattern: /^[0-9]+$/i }}
        />
        <FieldError name="0" data-testid="phoneFieldError" />
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    const phoneError = await waitFor(
      () => screen.getByTestId('phoneFieldError').textContent,
    )
    expect(phoneError).toEqual('0 is not formatted correctly')
  })

  it('returns appropriate values for fields with emptyAs not defined ', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField name="textField" />
        <TextField name="textAreaField" />
        <NumberField name="numberField" />
        <DateField name="dateField" />
        <SelectField name="selectField" defaultValue="">
          <option value="">No option selected</option>
          <option value={1}>Option 1</option>
          <option value={2}>Option 2</option>
          <option value={3}>Option 3</option>
        </SelectField>
        <CheckboxField name="checkboxField0" defaultChecked={false} />
        <CheckboxField name="checkboxField1" defaultChecked={true} />
        <TextAreaField
          name="jsonField"
          defaultValue=""
          validation={{ valueAsJSON: true }}
        />
        <TextField name="fieldId" defaultValue="" />

        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      {
        textField: '',
        textAreaField: '',
        numberField: NaN,
        dateField: null,
        selectField: '',
        checkboxField0: false,
        checkboxField1: true,
        jsonField: null,
        fieldId: null,
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it(`returns appropriate values for non-empty fields with emptyAs={'undefined'}`, async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField name="textField" emptyAs={'undefined'} />
        <TextAreaField name="textAreaField" emptyAs={'undefined'} />
        <NumberField name="numberField" emptyAs={'undefined'} />
        <DateField name="dateField" emptyAs={'undefined'} />
        <SelectField name="selectField" defaultValue="" emptyAs={'undefined'}>
          <option value="">No option selected</option>
          <option value={1}>Option 1</option>
          <option value={2}>Option 2</option>
          <option value={3}>Option 3</option>
        </SelectField>
        <SelectField
          name="selectFieldAsNumber"
          defaultValue=""
          emptyAs={'undefined'}
          validation={{ valueAsNumber: true }}
        >
          <option value={''}>No option selected</option>
          <option value={1}>Option 1</option>
          <option value={2}>Option 2</option>
          <option value={3}>Option 3</option>
        </SelectField>
        <TextAreaField
          name="jsonField"
          defaultValue=""
          validation={{ valueAsJSON: true }}
          emptyAs={'undefined'}
        />
        <TextField name="fieldId" defaultValue="" emptyAs={'undefined'} />

        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      {
        textField: undefined,
        textAreaField: undefined,
        numberField: undefined,
        dateField: undefined,
        selectField: undefined,
        selectFieldAsNumber: undefined,
        jsonField: undefined,
        fieldId: undefined,
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('returns null for empty fields with emptyAs={null}', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField name="textField" emptyAs={null} />
        <TextAreaField name="textAreaField" emptyAs={null} />
        <NumberField name="numberField" emptyAs={null} />
        <DateField name="dateField" emptyAs={null} />
        <SelectField name="selectField" defaultValue="" emptyAs={null}>
          <option value="">No option selected</option>
          <option value={1}>Option 1</option>
          <option value={2}>Option 2</option>
          <option value={3}>Option 3</option>
        </SelectField>
        <TextAreaField
          name="jsonField"
          defaultValue=""
          validation={{ valueAsJSON: true }}
          emptyAs={null}
        />
        <TextField name="fieldId" defaultValue="" emptyAs={null} />

        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      {
        textField: null,
        textAreaField: null,
        numberField: null,
        dateField: null,
        selectField: null,
        jsonField: null,
        fieldId: null,
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('returns appropriate value empty fields with emptyAs={0}', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField name="textField" emptyAs={0} />
        <TextAreaField name="textAreaField" emptyAs={0} />
        <NumberField name="numberField" emptyAs={0} />
        <DateField name="dateField" emptyAs={0} />
        <SelectField name="selectField" defaultValue="" emptyAs={0}>
          <option value="">No option selected</option>
          <option value={1}>Option 1</option>
          <option value={2}>Option 2</option>
          <option value={3}>Option 3</option>
        </SelectField>
        <TextAreaField
          name="jsonField"
          defaultValue=""
          validation={{ valueAsJSON: true }}
          emptyAs={0}
        />
        <TextField name="fieldId" defaultValue="" emptyAs={0} />

        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))

    expect(mockFn).toBeCalledWith(
      {
        textField: 0,
        textAreaField: 0,
        numberField: 0,
        dateField: 0,
        selectField: 0,
        jsonField: 0,
        fieldId: 0,
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it(`returns an empty string empty fields with emptyAs={''}`, async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField name="textField" emptyAs={''} />
        <TextAreaField name="textAreaField" emptyAs={''} />
        <NumberField name="numberField" emptyAs={''} />
        <DateField name="dateField" emptyAs={''} />
        <SelectField name="selectField" defaultValue="" emptyAs={''}>
          <option value="">No option selected</option>
          <option value={1}>Option 1</option>
          <option value={2}>Option 2</option>
          <option value={3}>Option 3</option>
        </SelectField>
        <TextAreaField
          name="jsonField"
          defaultValue=""
          validation={{ valueAsJSON: true }}
          emptyAs={''}
        />
        <TextField name="fieldId" defaultValue="" emptyAs={''} />

        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))

    expect(mockFn).toBeCalledWith(
      {
        textField: '',
        textAreaField: '',
        numberField: '',
        dateField: '',
        selectField: '',
        jsonField: '',
        fieldId: '',
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('should have appropriate validation for NumberFields and DateFields with emptyAs={null}', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <NumberField
          name="numberField"
          data-testid="numberField"
          emptyAs={null}
          validation={{ min: 10 }}
        />
        <FieldError name="numberField" data-testid="numberFieldError" />
        <DateField name="dateField" emptyAs={null} />
        <Submit>Save</Submit>
      </Form>,
    )
    fireEvent.change(screen.getByTestId('numberField'), {
      target: { value: 2 },
    })
    fireEvent.submit(screen.getByText('Save'))
    await waitFor(() =>
      expect(screen.getByTestId('numberFieldError')).toBeInTheDocument(),
    )

    // The validation should catch and prevent the onSubmit from being called
    expect(mockFn).not.toHaveBeenCalled()
  })

  it(`handles invalid emptyAs values with default values`, async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        {/* @ts-expect-error - pretend this is a .js file */}
        <TextField name="textField" emptyAs={'badEmptyAsValue'} />
        {/* @ts-expect-error - pretend this is a .js file */}
        <TextAreaField name="textAreaField" emptyAs={'badEmptyAsValue'} />
        {/* @ts-expect-error - pretend this is a .js file */}
        <NumberField name="numberField" emptyAs={'badEmptyAsValue'} />
        {/* @ts-expect-error - pretend this is a .js file */}
        <DateField name="dateField" emptyAs={'badEmptyAsValue'} />
        <SelectField
          name="selectField"
          defaultValue=""
          /* @ts-expect-error - pretend this is a .js file */
          emptyAs={'badEmptyAsValue'}
        >
          <option value="">No option selected</option>
          <option value={1}>Option 1</option>
          <option value={2}>Option 2</option>
          <option value={3}>Option 3</option>
        </SelectField>
        <TextAreaField
          name="jsonField"
          defaultValue=""
          validation={{ valueAsJSON: true }}
          /* @ts-expect-error - pretend this is a .js file */
          emptyAs={'badEmptyAsValue'}
        />
        {/* @ts-expect-error - pretend this is a .js file */}
        <TextField name="fieldId" defaultValue="" emptyAs={'badEmptyAsValue'} />

        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))
    expect(mockFn).toBeCalledWith(
      {
        textField: '',
        textAreaField: '',
        numberField: NaN,
        dateField: null,
        selectField: '',
        jsonField: null,
        fieldId: null,
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('should return a number for a textfield with valueAsNumber, regardless of emptyAs', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField
          name="tf1"
          validation={{ valueAsNumber: true }}
          defaultValue="42"
        />
        <TextField
          name="tf2"
          validation={{ valueAsNumber: true }}
          defaultValue="42"
          emptyAs={'undefined'}
        />
        <TextField
          name="tf3"
          validation={{ valueAsNumber: true }}
          defaultValue="42"
          emptyAs={null}
        />
        <TextField
          name="tf4"
          validation={{ valueAsNumber: true }}
          defaultValue="42"
          emptyAs={0}
        />
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))

    expect(mockFn).toBeCalledWith(
      {
        tf1: 42,
        tf2: 42,
        tf3: 42,
        tf4: 42,
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('should return a date for a textfield with valueAsDate, regardless of emptyAs', async () => {
    const mockFn = vi.fn()

    render(
      <Form onSubmit={mockFn}>
        <TextField
          name="tf1"
          validation={{ valueAsDate: true }}
          defaultValue="2022-02-01"
        />
        <TextField
          name="tf2"
          validation={{ valueAsDate: true }}
          defaultValue="2022-02-01"
          emptyAs={'undefined'}
        />
        <TextField
          name="tf3"
          validation={{ valueAsDate: true }}
          defaultValue="2022-02-01"
          emptyAs={null}
        />
        <TextField
          name="tf4"
          validation={{ valueAsDate: true }}
          defaultValue="2022-02-01"
          emptyAs={0}
        />
        <Submit>Save</Submit>
      </Form>,
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(mockFn).toHaveBeenCalledTimes(1))

    expect(mockFn).toBeCalledWith(
      {
        tf1: new Date('2022-02-01'),
        tf2: new Date('2022-02-01'),
        tf3: new Date('2022-02-01'),
        tf4: new Date('2022-02-01'),
      },
      expect.anything(), // event that triggered the onSubmit call
    )
  })

  it('should throw an intelligible error if the name prop is missing', async () => {
    const mockFn = vi.fn()

    const testRender = () =>
      render(
        <Form onSubmit={mockFn}>
          {/* @ts-expect-error - Testing a JS scenario */}
          <TextField />
          <Submit>Save</Submit>
        </Form>,
      )

    expect(testRender).toThrow('`name` prop must be provided')
  })
})
