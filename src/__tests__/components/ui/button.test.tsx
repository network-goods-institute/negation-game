import React from 'react'
import { render, screen } from '../../utils/test-utils'
import { Button } from '@/components/ui/button'

describe('Button', () => {
    it('renders correctly with default props', () => {
        render(<Button>Click me</Button>)
        expect(screen.getByRole('button')).toBeInTheDocument()
        expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>)
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('renders with text in different positions', () => {
        const { rerender } = render(
            <Button text="Label" textPosition="left">
                Content
            </Button>
        )

        let label = screen.getByText('Label')
        expect(label).toHaveClass('mr-2')

        rerender(
            <Button text="Label" textPosition="right">
                Content
            </Button>
        )

        label = screen.getByText('Label')
        expect(label).toHaveClass('ml-2')
    })
}) 