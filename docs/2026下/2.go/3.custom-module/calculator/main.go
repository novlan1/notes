package calculator

import "math"

func CircleArea(radius float64) float64 {
	return math.Pi * radius * radius
}

func RectangleArea(width, height float64) float64 {
	return width * height
}

func square(x float64) float64 {
	return x * x
}

func SquareArea(side float64) float64 {
	return square(side)
}
