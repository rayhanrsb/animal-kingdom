const VoteSummary = ({ vote }: { vote: object }) => {
  const objToArr = (obj: object) => {
    let arrToReturn: any[] = [];
    for (const key in obj) {
      arrToReturn = [...arrToReturn, obj[key as keyof object]];
    }
    return arrToReturn;
  };

  const snakeToTitleCase = (string: string): string => {
    return string
      .split("_")
      .map((word) => {
        return word.slice(0, 1).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };
  return (
    <section className="votes">
      <p>Here is how you voted:</p>
      {objToArr(vote.votes).map((vote) => (
        <article key={vote.organisationName} className="input-vote">
          <p>{snakeToTitleCase(vote.organisationName)}</p>
          <article className="vote-slider">
            <input
              type="range"
              min="0"
              max="100"
              value={Number(vote.amount)}
              id={vote.organisationName}
              name={vote.organisationName}
              className="slider"
            />
            <label htmlFor={vote.organisationName}>{Number(vote.amount)}</label>
          </article>
        </article>
      ))}
    </section>
  );
};

export default VoteSummary;
