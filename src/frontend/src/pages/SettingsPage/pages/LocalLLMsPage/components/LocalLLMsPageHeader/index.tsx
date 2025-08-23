import ForwardedIconComponent from "@/components/common/genericIconComponent";

const LocalLLMsPageHeader = () => {
  return (
    <>
      <div className="flex w-full items-center justify-between gap-4 space-y-0.5">
        <div className="flex w-full flex-col">
          <h2 className="flex items-center text-lg font-semibold tracking-tight">
            Local LLMs
            <ForwardedIconComponent
              name="Bot"
              className="ml-2 h-5 w-5 text-primary"
            />
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your local language models powered by embedded Ollama.
          </p>
        </div>
      </div>
    </>
  );
};

export default LocalLLMsPageHeader;
