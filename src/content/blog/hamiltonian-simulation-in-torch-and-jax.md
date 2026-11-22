---
title: "Hamiltonian simulation in Torch and Jax"
date: "2026-11-22"
description: "Simulating any physical system from just its Hamiltonian with autodiff, plus what it took to make it fast in Torch and JAX."
tags:
  - blog/published
author: "Carlos Gomes"
draft: false
pubDate: "2026-11-22"
---

I wrote a library for computing and visualizing arbitrary hamiltonians with Autodiff engines.

- Torch: https://github.com/CarlosGomes98/Hamiltonian-Visualizer
- JAX: https://github.com/CarlosGomes98/hamiltonian-jax

This post is motivated by [The Theoretical Minimum](https://theoreticalminimum.com/), a great lecture series (and set of books) from Leonard Susskind that aims at teaching physics to people who already have some other type of STEM background. Working through it, I was introduced to the Hamiltonian. Seeing as autodiff engines are my hammer, I naturally saw this as a nail to strike.

![double_pendulum](/images/blog/double_pendulum.gif)
*A double pendulum, simulated from a Hamiltonian written as a short JAX function. Left: its trajectory through phase space. Right: what it looks like.*

## What is the Hamiltonian
The Hamiltonian is a function that describes how physical systems evolve over time. It allows us to model particles using phase space. Phase space represents every particle's position (q) and momentum (p), and the Hamiltonian is equal to the total energy of the system (with some caveats, see the note below). It is a very useful formulation that allows us to solve complex systems from different reference frames.

> **For the physics nerds**
>
>Writing a correct, complete and concise explanation of the Hamiltonian that is approachable to folks without a physics background (like me) is impossible, so one of those three has to give. In this post, I'm focusing on mechanical systems, which allows me to make this description simpler without being too technically wrong, and limiting myself to a velocity and time independent potential (e.g. gravity doesn't care how fast you are going or what day of the week it is to determine how hard it pulls you, just how far you are from the mass). In Cartesian coordinates the kinetic energy depends only on $p$; in other coordinates (like the angles of the double pendulum below) it can depend on $q$ too. Autodiff doesn't care either way.

For *simple* mechanical systems, the Hamiltonian $H$ is:

$$
H(q, p) = T(q, p) + V(q)
$$

where $T$ is the kinetic energy and $V$ is the potential energy. The evolution of this system is given by the time derivatives of p and q, $\dot p$ and $\dot q$:

$$
\dot q=\frac{\partial H}{\partial p}, \qquad \dot p=-\frac{\partial H}{\partial q}
$$



> **Why would I use this? I already know $F=ma$**
>
> There are many benefits of this formulation, but looking exclusively at those that help us solve modeling problems:
>1. The whole system is captured in one scalar function $H$, even for very complex systems. The natural formulation is also done using $2n$ first-order differential equations, instead of the $n$ second-order differential equations with $F=ma$, where $n$ is the degrees of freedom of the system. $F=ma$ is second order since $a = \frac{dv}{dt} = \frac{d^2x}{dt^2}$.
>2. It handles different coordinate systems or reference frames elegantly, making certain problems much easier. Take a simple single-particle system and you will recover $F=ma$. However, take a rotating coordinate frame and you will recover centrifugal and Coriolis forces. You can choose to represent a double pendulum using the Cartesian coordinates of the weights, or a more natural representation based on the angles of the pendulums, and solve it using much less ink. It just turns out to be much easier to work with the Hamiltonian for many problems.
>3. Taking position and momentum as the fundamental quantities reveals the structure of motion. Studying these curves naturally reveals patterns connected to stable vs chaotic motion.

If you work with ML, maybe you had the same thought as I did: as long as we have a differentiable implementation of $H$, can we just use automatic differentiation engines to evolve the system? 

For instance, here is a harmonic oscillator written out in python (specifically JAX).

```python
def harmonic(state):
    omega = 2.0 * jnp.pi
    return (0.5 * omega * (state.q**2 + state.p**2)).sum()
```

Given this, can we now just see what it looks like? Evidently I was very late to this party, as there are plenty of libraries that do this already. But I still thought it was cool enough that I wanted to try and build my own implementation. **Given any arbitrary differentiable H, written in torch (or jax), can we model it?**
## Design idea

The set up is as follows:
1. Take a system with some initial state. Each particle has a position and momentum coordinate for each dimension. For $N$ particles in $2$ dimensions that means $2$ vectors ($p$ and $q$) each with $2 \times N$ values
2. Write out the hamiltonian for the system. This needs to be a differentiable function.
3. At each time step, find the time derivatives of p and q as defined above, apply them with some step size dt and loop until satisfied.
![Hamiltonian design v1](/images/blog/Hamiltonian%20design%20v1.excalidraw.png)


As it turns out, it's useful to explicitly introduce the concept of a field, vectors covering the entire phase space, that tell each point in phase space how to evolve to the next time step. We only ever evaluate it at one point: the current state of the system. Such a field is what we get from applying the autodiff engine to the Hamiltonian, and it's useful to admit other fields (whether coming from autodiff or not) and combine them. For example, for modeling situations where energy is not conserved, it is useful to introduce a damping field.

In JAX, the meat of evaluating the hamiltonian looks like this. 

```python
def hamiltonian_field(H):
    def field(state):
        g = jax.grad(H)(state)            # g.q = ∂H/∂q, g.p = ∂H/∂p
        return PhaseVector(q=g.p, p=-g.q) # swap and negate: that's all of Hamilton
    return field
```

That swap-and-negate is the key difference from gradient descent. Gradient descent steps along $-\nabla H$, straight downhill, so the energy would drain away until the system settles at a minimum. Hamilton's equations rotate that gradient by 90°. A vector perpendicular to $\nabla H$ points *along* the contours of $H$ rather than across them, so the system slides around a constant-energy curve forever. That's what energy conservation looks like geometrically, and it's why the harmonic oscillator below traces a circle in phase space.

![Hamiltonian design v2](/images/blog/Hamiltonian%20design%20v2.excalidraw.png)

And that's basically a working prototype! Below is the architecture diagram I ended up with.

![Hamiltonian architecture](/images/blog/Hamiltonian%20architecture.excalidraw.png)

## Examples

Both examples below are the same three lines of setup: write `H`, wrap it with `hamiltonian_field`, hand it to a `Simulator`. The left panel of each clip is phase space (`q` against `p`, with the field's arrow and the energy drift), the right is what the system actually looks like. The runnable versions are in `examples/` in the repo.

### Harmonic oscillator

The simplest possible system: a mass on a spring, `H = ω/2 (q² + p²)`. 

```python
def harmonic(state):
    omega = 2.0 * jnp.pi
    return (0.5 * omega * (state.q**2 + state.p**2)).sum()

sim = Simulator([hamiltonian_field(harmonic)], Engine(rk4_method), initial, dt=0.005,
                observables={"energy": harmonic})
```

![harmonic](/images/blog/harmonic.gif)

### Double pendulum

Two unit masses on two unit rods, written in terms of the two angles. Writing this one in Cartesian coordinates would mean constraint forces; in angles the cost is a messy kinetic term, which autodiff doesn't care about anyway.

```python
def double_pendulum(state):
    t1, t2 = state.q[0], state.q[1]
    p1, p2 = state.p[0], state.p[1]
    d = t1 - t2
    T = (p1**2 + 2 * p2**2 - 2 * p1 * p2 * jnp.cos(d)) / (2 * (1 + jnp.sin(d)**2))
    V = -2 * jnp.cos(t1) - jnp.cos(t2)
    return T + V

sim = Simulator([hamiltonian_field(double_pendulum)], Engine(rk4_method), initial, dt=0.005,
                observables={"energy": double_pendulum})
```

Here `q` holds angles, so the visualizer needs an embedding to turn them into bob positions.

```python
def double_pendulum_embed(q):
    t1, t2 = q[0], q[1]
    pivot = jnp.zeros(2)
    bob1 = pivot + jnp.stack([jnp.sin(t1), -jnp.cos(t1)])
    bob2 = bob1 + jnp.stack([jnp.sin(t2), -jnp.cos(t2)])
    return jnp.stack([pivot, bob1, bob2])
```

This is the clip at the top of the post. The phase plot is a 2-D projection (`θ₁`, `p₁`) of the 4-D state, which is why the curve crosses itself. In the full 4-D space a trajectory can never cross itself (each state has exactly one future), but its shadow on a 2-D plane can.

## Issues

While this first approach technically works, there were a few issues with the implementation.

### 1. Speed

The simulator is painfully slow. At first glance, the actual simulation work looks tiny compared with the visualization.

Below is a profile of a single frame, which includes a simulation step followed by a visualizer step that updates the frame. One `visualizer.step` (updating the frame) takes ~34 ms and one eager torch step ~0.3 ms, so the simulation is only ~1% of the frame. 

![profile_frame](/images/blog/profile_frame.png)

Let's say our goal is real-time simulation. `dt` trades accuracy for compute; with the Euler integrator I started with, I needed dt = 1e-4 to keep the energy drift small. That means 10,000 steps per simulated second. The above only gets us about 30 steps per second. Clearly this will never be viable, so let's introduce a requirement of 30fps, where we do additional simulation steps between each frame update. Now that means we need to do ~330 simulation steps for each visualizer step, with a budget of ~33ms per frame. The visualizer runs in matplotlib, and I don't want to try to optimize it, so that leaves the simulator.

Batching ~330 simulator steps per visualizer step gets us the first bar below. Each eager step costs ~100 µs once they're batched, so the simulation takes ~30 ms and doubles the frame time. The bottom bars show where we're headed.

![profile_frame_330](/images/blog/profile_frame_330.png)

Analyzing the system again, I found that the time was going to per-op overhead, not math. Each step is a few hundred tiny operations (multiplies, cosines, plus the autograd bookkeeping for the gradient of H), and each one goes through Python and the PyTorch dispatcher before doing a tiny amount of actual work. These profiles ran on CPU. On a GPU you would additionally pay a kernel launch for each of those ops. Eager torch spends ~100 µs per step, and compiling the same math brings it to ~2 µs, so about 98% of the eager time was overhead rather than math.

The solution is to do a type of kernel fusion ([Defanging kernels](/blog/defanging-kernels/)), but to do it cleverly.

If we want to take 500 steps, a trivial solution may be to write a function that loops the step function 500 times, and compile it (e.g. torch.compile). This presents a few downsides:
1. Compile time will be a function of the step count, so this compilation will take a long time
2. We will likely want to take a variable number of steps each time. This is so that we try to maintain a constant rate of time evolution w.r.t. the frame rate we are able to achieve. Every time we want a new step count, we need to compile again.

The solution is to compile a few fixed chunk sizes in advance (I used 10 and 1) and then break down large sets of steps into these. For instance, to take 121 steps, we would take $12 \times 10 + 1$ steps. You may notice the examples above are in JAX. That's because jax makes our life much easier here with the `jax.lax.fori_loop` function. This allows us to trace the step once and treat the number of steps as a traced argument, rather than a baked-in constant. 

![profile_batching](/images/blog/profile_batching.png)

- **torch eager**: nothing is compiled. A Python loop runs the step N times, and each step is a few hundred tiny ATen ops dispatched one at a time (including autograd for the gradient of H).
- **torch compiled**: `torch.compile` turns 10 steps into one graph, and a compiled single step handles the remainder. So N steps is N//10 chunk calls plus N%10 single-step calls.
- **JAX jit**: the whole call is one XLA program, a `fori_loop` over N steps, with N passed in as a traced argument. There is no Python per step.

Here is a profile of one `sim.run(10)`, from `torch.profiler`. Eager execution has 2,578 operators with lots of idle gaps between them (Python dispatch), whereas compiled has ~280. This was run on cpu.

![profile_timeline_torch](/images/blog/profile_timeline_torch.png)



### 2. Visualization

Visualizing some states is trivial, like a 1 particle system in 1 or 2-D. But what about states with multiple particles? Such p and q vectors are indistinguishable from a single particle in many dimensions.

Or what about the double pendulum above, where p and q represent angles rather than cartesian coordinates? How do we map these cases to a nice plot?

The solution is to express this mapping to a visualizable subspace as an embedding transformation. This transformation maps from the dimension of Q to (n_points, 2). We limit ourselves to 2-dimensional space, but allow many points.

The great thing about this is that we can obtain the velocity vectors of the points in the embedding space from the points in Q space with a simple chain rule - and JAX handles that automatically for us. `jax.jvp` (a Jacobian-vector product, i.e. forward-mode autodiff): `points, velocities = jax.jvp(embed, (q,), (q_dot,))` returns the embedded points and the matching velocities $J_{\text{embed}}(q)\,\dot q$ in a single pass. Here $\dot q = \partial H / \partial p$ comes straight from the field. 

![Jacobian visualization](/images/blog/Jacobian%20visualization.excalidraw.png)

### 3. Drift

The numerical method we have been using `next_state = cur_state + field * dt` is called Euler's method. It is simple, but tends to accumulate error. In our case, it is very easy to measure the error, as we know that the total energy of the system must remain constant. I incorporate this drift measurement in the visualization (the energy readout in the phase-space panel).

With some quick research, I found that there are a few other methods that can be used, namely RK4 and Symplectic Euler. I just implemented RK4 without really looking into it and got much better results. It is a much more expensive method (requires 4 evaluations of the field per step), but we can use much larger values of `dt`, meaning fewer system evolutions per visualizer step. RK4 still isn't perfect: it loses a tiny bit of energy every step, so over a very long run the orbit slowly shrinks. 

With RK4 I found dt = 0.005 was stable, meaning real-time simulation needs only ~7 steps per frame, so the speed problem mostly goes away for these systems. The batching still matters for stiffer systems, more particles, or running faster than real time.

## Conclusion
This was a fun project to work on while getting to understand hamiltonians. Unexpectedly I was also able to get a bit of perf optimization work in, which is always nice. The things I'll take away from it:

- **Hamiltonian mechanics is a rotated gradient.** Autodiff gives you $\nabla H$; swap and negate it and you get motion that conserves energy instead of minimizing it.
- **The integrator matters as much as the field.** Plain Euler makes the energy drift.
- **Small simulations are all overhead.** Once compiled into one loop, a step takes tens of nanoseconds; Python and dispatch take ~100 µs. Getting the whole loop into a single compiled program (JAX's `fori_loop` with a traced step count) is the way to go.

If you're curious, feel free to try out the repos from the links above!