---
title: Why you should take a look at functionnal programming
publish_date: 22 January 2020
---

::: caution
**Caution:** I'm not a functionnal programming expert, I don't really know any fully functionnal programming language and I don't know most of the functionnal programming concepts. This article is just to explain why I find it interesting.
:::

Basically functionnal programming is a way of coding using only functions, without mutable variables.<br/>
The first functionnal programming language is the [lambda calculus](https://en.wikipedia.org/wiki/Lambda_calculus):

```
The function for true: (λx.λy.x)
The function for false: (λx.λy.y)
The function for NOT: (λx.x((λx.λy.y), (λx.λy.x)))
The function for OR: (λx.λy.x((λx.λy.x)¸ y((λx.λy.x), (λx.λy.y))))
The function for AND: (λx.λy.x(y((λx.λy.x), (λx.λy.y)), (λx.λy.λy)))
The YCombinator: (λf.(λx.f(x, x))(λx.(f(x, x))))
```

::: subtitle
Even if it's theoretically really interesting, the lambda calculus can be really hard to read
:::

In this language there wasn't any variable concept, everything is a function, but in most modern fully functionnal programming languages you can define constants and use numbers, arrays, etc...<br/>
Although mutable variables aren't allowed.

You can't use for/while loop (because it would use an iterator index) instead you have to use recursivity.

## Advantages of functionnal programming

First, it makes programming look more like maths and I think that's beautiful. 😍

If you want to add a line of code you can add it anywhere, in functionnal programming there are no side effects, you can't break your code by adding a line before another because they can't influence each other.

```
A = something()
// If you were to change the value of A here it would influence the value of B, because variables aren't mutable you can't do this in functionnal programming
B = something_else(A)
```

Another really cool point: you can parallelize things really easily, if a constant doesn't use another constant in its definition (and reciprocally) you can do it in parallel and be sure they won't conflict with each other.

```
A = something1()
B = something2(A) // Here you can't compute A and B in parallel
C = a_slow_function(B)
D = an_other_slow_function(A) // Here you can compute C and D in parallel
E = something3(C, D)
```

To know what you can compute in parallel you just have to draw a graph of the constants and draw an arrow between the constants and the other ones used in its definition.

```
A -> B -> C -> E
  \          /
   \----D---/
```

We clearly see here that B and C can be computed in parallel of D

## Downsides

Functionnal programming force us to make recursive algorithms instead of iterative ones, which can lead to a lack of performance.

```
fn recursive_fibo(n: u32) -> u32 {
	match n {
		0 | 1 => n,
		_ => recursive_fibo(n - 1) + recursive_fibo(n - 2),
	}
}

fn iterative_fibo(n: u32) -> u32 {
	let mut n_minus_1 = 0;
	let mut res = 1;

	if n < 2 {
		return n;
	}

	for _ in 1..n {
		let n_minus_2 = n_minus_1;
		n_minus_1 = res;
		res = n_minus_2 + n_minus_1;
	}
	res
}
```

```
Execution time recursive_fibo(42): 0m4.562s
Execution time iterative_fibo(42): 0m0.002s
```
::: subtitle
Even if the recursive one is much more beautiful, the iterative one is more performant
:::

## Conclusion

I will try to keep the functionnal programming concepts in mind, see where it's useful and doesn't make any/too much running speed difference and use it to think about parallelism.

I really think it's a beautiful way of coding and even if I don't totally understand it yet I really want to use it to improve the way I think about programming.
