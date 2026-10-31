// implementar o plan-execute.ts seguindo o exemplo abaixo

// o estado de referencia
const PEState = Annotation.Root({
    input: Annotation<string>(),
    plan: Annotation<string>(),
    done: Annotation<[string, string][]>({
        reducer: (a, b) => a.concat(b),
        default: () => [],
    }),
    answer: Annotation<string>(),
});

// o planner - referencia
const planSchema = z.object({
    steps: z
        .array(z.string())
        .describe(
            "passos curtos, ordenados, executáveis com as ferramentas disponíveis",
        ),
});

async function planner(state: typeof PEState.State) {
    const plan = await createModel()
        .withStructuredOutput(planSchema)
        .invoke([
            ["system", PLANNER_PROMPT],
            ["user", state.input],
        ]);
    return { plan: plan.steps };
}
