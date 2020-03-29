---
title: Implementing a minimal Lisp to learn Lisp
publish_date: 29 March 2020
js_script: script.js
---

::: caution
**Caution:** I am still in the process of learning, I don't claim to be a Lisp programmer, I don't claim to really understand Lisp nor Functionnal programming either. This blog article reflects my path in the weird but fascinating world of functionnal programming.
:::

A few weeks ago, a friend of mine talked about his willing to learn Lisp. At this time Lisp was for me a synonym of parentheses hell.

I did some research and I felt like, in its minimal form, Lisp was kind of a "readable lambda calculus". I liked it.

![I guess I'm one of them now](https://imgs.xkcd.com/comics/lisp_cycles.png "Lisp Cycles - xkcd 297")

I soon realized the language syntax was really minimalist, and it would be a fun challenge to recode a simple dialect. Obviously I would make it Rust.

[Here is the repo](https://github.com/lowczarc/Lisp-Interpreter). At the time I write this my last commit is the [`5edc294`](https://github.com/lowczarc/Lisp-Interpreter/tree/5edc294).

## Parentheses !!!

The most visible thing when you see some Lisp code for the first time is the stupid amount of parentheses, it seems horrible.

Lisp code is based on the concept of lists. There is only lists and atoms (an atom is a number or a symbol) and lists are defined with parentheses and spaces between their elements.

Lisp is actually just a data format.

```mini-lisp
("Finish this article" "Integrate my lisp interpreter in wasm to make this article interactive" "Go to bed")
```
::: subtitle
My current todo list in lisp format
:::

In Rust, the structure of a Lisp program can be implemented with this enum:

```rust
enum Slisp {
	Atom(String),
	List(Vec<Slisp>),
}
```

The parsing is pretty straightforward and is implemented in the function parse_lisp in [src/lib.rs](https://github.com/lowczarc/Lisp-Interpreter/blob/5edc294/src/lib.rs)

## Eval: from data to program

In Lisp the function calls are just list with the first element being the function name and the other elements being the parameters

```mini-lisp
(print (+ 6 7))
```
::: subtitle
We want this to print the result of the addition of 6 and 7
:::

We can make a function eval which takes a context (for the functions definitions) and a List.

Because we want our structure and our data to be the same thing we will need to add some elements to our enum :

```rust
type Context = HashMap<String, Slisp>;

#[derive(Clone)]
struct LispFunction(pub Rc<Box<dyn Fn(&mut Context, Vec<Slisp>) -> Slisp>>);

#[derive(Clone)]
enum Slisp {
	Atom(String),
	List(Vec<Slisp>),
	Func(LispFunction),
	Numeric(i32),
	None,
}
```

Our function eval can be defined with :

```rust
fn eval(context: &mut Context, program: Vec<Slisp>) -> Slisp {
	let mut args = program.into_iter();
	let function_name = args.next();
	let arguments: Vec<Slisp> = args.collect();

	if let Some(Slisp::Atom(name)) = function_name {

		// Here we search for the name specified in the Atom in the context

		let function = if let Some(Slisp::Func(function)) = context.get(&name) {
			function.0.clone()
		} else {
			panic!(format!("No function named {} in the context", name));
		};

		function(context, arguments)
	} else if let Some(Slisp::List(subelem)) = function_name {

		/*
			Here we have a list to evaluate for function call
			Example: ((if x + -) 5 6) is the equivalent of (if x (+ 5 6) (- 5 6))
		*/

		if let Slisp::Func(f) = eval(context, subelem) {
			f.0(context, arguments)
		} else {
			panic!("Only function are callables");
		}
	} else {
		panic!("Invalid function call: {:?}", function_name);
	}
}
```

This function will be used in the first call of the program and to evaluate the arguments of the functions if they are lists.

To make it easier to write functions later we can already make a function which takes a Slisp and evaluates it if it's a list and takes its value in the context if it's an atom.

```rust
fn get_value(context: &mut Context, literal: Slisp) -> Slisp {
	match literal {
		Slisp::Atom(s) => {
			if let Ok(x) = s.parse::<i32>() {
				Slisp::Numeric(x)
			} else if let Some(value) = context.get(&s) {
				value.clone()
			} else {
				Slisp::None
			}
		}
		Slisp::List(l) => eval(context, l),
		x => x,
	}
}
```

We can already add the [basic arithmetics functions](https://github.com/lowczarc/Lisp-Interpreter/blob/5edc294/src/functions/arithmetics.rs), the [minimal lists functions](https://github.com/lowczarc/Lisp-Interpreter/blob/5edc294/src/functions/list.rs), [print and if_else](https://github.com/lowczarc/Lisp-Interpreter/blob/5edc294/src/functions/utils.rs) and a [function to add an element to the context](https://github.com/lowczarc/Lisp-Interpreter/blob/5edc294/src/functions/def.rs)

At this point, our language is just a dumb calculator and isn't Turing Complete

```mini-lisp
(def x 41)

(print (list (- (+ x 98)
                (* (/ 65 13) (- 76 3)))
             (+ 1 x)))
```
::: subtitle
We can already make some calculations, but we need something more to make it really interesting
:::

## Lambda magic

Now we can add our secret ingredient: Functions 🎉

Because it's heavily inspired by the lambda calculus I've chosen to call the function to define function "λ" (or "lambda" if your keyboard doesn't support it)

The first argument is the parameter name and the second is the body of the function

```mini-lisp
(def fibo
     (λ n
        (if (< n 2)
            n
            (+ (fibo (- n 1)) (fibo (- n 2))))))
```
::: subtitle
A naive recursive function for fibonnacci
:::

A lambda takes only one parameter but you can define multiple argument functions by nesting them.

```mini-lisp
(def range
     (λ min
        (λ max
           (if (= min max)
               (list)
               (push (range min (- max 1)) (- max 1))))))
```
::: subtitle
A function that creates a list containing all the integers between min and max
:::

It is defined in Rust by :

```rust
fn lambda(_context: &mut Context, args: Vec<Slisp>) -> Slisp {
	let mut arguments = args.into_iter();

	let lambda_arg = if let Slisp::Atom(s) = arguments
		.next()
		.expect("Wrong number of arguments in lambda definition")
	{
		s
	} else {
		panic!("Lambda var must be an atom")
	};
	let lambda_body = arguments
		.next()
		.expect("Wrong number of arguments in lambda definition");

	Slisp::Func(LispFunction(Rc::new(Box::new(
		move |context: &mut Context, args: Vec<Slisp>| {
			let mut arguments = args.into_iter();

			let arg = get_value(
				context,
				arguments
					.next()
					.expect("Wrong number of arguments in lambda call"),
			);

			/*
				We temporarily put the argument in the context
				with the name defined in the lambda definition.
			*/
			let tmp = context.remove(&lambda_arg);
			context.insert(lambda_arg.clone(), arg);

			// We evaluate lambda_body
			let mut result = get_value(context, lambda_body.clone());

			/*
				If there is more than one argument and the lambda return
				another lambda we call it with the next arguments.
			*/
			if let Slisp::Func(f) = &result {
				let args: Vec<Slisp> = arguments.collect();
				if args.len() > 0 {
					result = f.0(context, args);
				}
			}


			// We remove the temporary value from the context
			context.remove(&lambda_arg);

			if let Some(tmp_var) = tmp {
				context.insert(lambda_arg.clone(), tmp_var);
			}
			result
		},
	))))
}
```
::: subtitle
The scope management is really basic and stupid, I will probably change it later
:::

## Conclusion

That's all for now. There are a lot of features missing to claim it to be a real Lisp language (quotes, macros ...) but I have to admit that I don't really understand them yet.<br>
I'll continue to improve it on github and if I find it interesting I may write other articles on this subject.

## Erratum on the last article

In the paragraph "Downsides" of my [last article](/why_you_should_take_a_look_at_functionnal_programming/#downsides) I made a mistake.

I've said recursive algorithms can lead to a lack of performance and take the example of the function fibonnacci.<br>
First, you can construct a recursive equivalent for any iterative function, in the case of fibonnacci :

```mini-lisp
(def range
     (λ min
        (λ max
           (if (= min max)
             (list)
             (push (range min (- max 1)) (- max 1))))))

(def ifibo
     (λ n
        (if (< n 3)
          (range 0 n)
          ((λ l (push l (+ (last l) (last (pop l))))) (ifibo (- n 1))))))
```
::: subtitle
ifibo is a function which construct the nth first elements of the fibonnacci sequence with the same complexity as the iterative algorithm
:::

Secondly, the fastest algorithm to compute the fibonnacci sequence is actually a recursive one.
```mini-lisp
(def % (λ x (λ y (- x (* (/ x y) y)))))
(def ² (λ x (* x x)))
(def get (λ l (λ i (if (= (len l) (- i 1)) (last l) (get (pop l) i)))))

(def fdfibo
     (λ n
        (if (< n 3)
          (get (list 0 1 1) n)
          (if (= (% n 2) 0)
              ((λ fk (* fk (- (* 2 (fdfibo (+ (/ n 2) 1))) fk)))
               (fdfibo (/ n 2)))
              (+ (² (fdfibo (+ (/ n 2) 1))) (² (fdfibo (/ n 2))))))))
```
::: subtitle
Fast doubling fibo is the fastest way to compute the fibonnacci sequence
:::
