use rstat::univariate;
use rstat::Distribution;

pub fn update_mean_and_variance(
    mean_a: f64,
    sigma_a: f64,
    mean_b: f64,
    sigma_b: f64,
    a_wins: bool,
) -> (f64, f64, f64, f64, f64) {
    //### Calculate some helpful values. ###

    let rating_diff = mean_a - mean_b; //#This can be negative, that is intended.
    let match_variablity = sigma_a.powf(2.0) + sigma_b.powf(2.0); //#A simple method to combine the variablity of both players.
    let sqrt_match_variablity = f64::sqrt(match_variablity); //#We end up computing this a lot

    //#How likely is a win for A? Bayesian methods let us create a normal distrubution by combining the two players ratings and variabiilies to estimate this.
    let dist = univariate::normal::Normal::standard();
    let x = rating_diff / (sqrt_match_variablity + 241.0);
    let win_prob = dist.cdf(&x);

    //#How suprising was the result?
    //#Also, the direction is positive when A wins, and negative if B wins.
    let result_suprise: f64;
    let direction_of_update: f64;
    if a_wins {
        result_suprise = 1.0 - win_prob;
        direction_of_update = 1.0;
    } else {
        result_suprise = win_prob.into();
        direction_of_update = -1.0;
    }

    //### Update Means ###

    let fourth_root_match_variablity = f64::sqrt(sqrt_match_variablity);
    
    let mut mean_a_new = mean_a;
    let mut mean_b_new = mean_b;
    
    //This part makes it so that with every win or loss a small amount of rating is transferred. This helps players feel like that are achieving something when a win or loss occurs.
    mean_a_new += 2.0 * direction_of_update * result_suprise;
    mean_b_new -= 2.0 * direction_of_update * result_suprise;
    
    //this is the part that can swing wildly for how much rating is gained or lost if the player's drift is high, and especially if it is high relative to the opponent.
    //that is why the variance/drift/deviation adjustment had to be made above, as we need to reduce drift quickly to prevent massive fluctuations.
    mean_a_new += 0.25 * direction_of_update * result_suprise * ((sigma_a - 0.8).powf(1.5)) / fourth_root_match_variablity;
    mean_b_new -= 0.25 * direction_of_update * result_suprise * ((sigma_b - 0.8).powf(1.5)) / fourth_root_match_variablity;


    //# Going over each term:
    //# mean is the original rating of the player
    //# direction_of_update is who won, and that's either 1.0 or -1.0. The direction of the update.
    //# 10 is used to flatly increase the size of updates so they are more human interpretable.
    //# result_suprise is between 0.001 and 1.001, therefore it will (almost) always reduce the size of the update. It models the intuition that a "sure" win doesn't offer much information, whereas a massive upset calls into question our assumptions about how good the player really is.
    //# (sigma**2.5 / match_variablity) = (sigma**2.5 / sigma_A**2 + sigma_B**2). This term effectively reduces the size of the update depending on how uncertain we are about the opponents rating and increased it based on how uncertain we about the player's rating.

    //### Update Variance ###
    //# Before we start, it's important to understand this is *not* a statistical valid way of estiamting variance.
    //# We explicitly are using a simplified, biased, and suboptimal model.
    //# There are two mean reasons for this.
    //# First, the assumptions required to use an unbiased and optimal model are unlikely to be furfilled, causing it to become biased and suboptimal while also being highly complex
    //# Second, optimal and unbiased models tend to be brittle, when they start to break, they break hard.

    //# Onto the biased and suboptimal but also resilent and simple method!
    //# First, we want a higher level scaling factor. This is a number which is pretty close to 1.0, and gently increases or decreases the overall variance.

    //# Second, we want to add or subtract from the variance.
    //# If the result is a suprise, we should add to it, otherwise, reduce.
    //# (result_suprise-0.5) moves result_suprise into the -0.5 to 0.5 range, straddling the 50% win chance.
    //# We multiply that by one hundred and then multiple it again by the result_suprise. Multiplying by result_suprise is a technique from importance sampling.
    //# Then, we want to create a mild reduction in variance if two players of equal skill continously go even.
    //# We multiply by (1-result_suprise) in this case because a 60% suprise should reduce variance less than a 40% suprise.

    let variance_adjustment_factor = (1.5 + result_suprise) / 2.01;
    let variance_adjustment_constant = (result_suprise-0.5) * result_suprise;

    let mut sigma_a_new = (sigma_a + variance_adjustment_constant) * variance_adjustment_factor;
    let mut sigma_b_new = (sigma_b + variance_adjustment_constant) * variance_adjustment_factor;

    //#We don't actually want variance to reduce that much if the mean isn't changing.
    //#e.g. A player farming someone rated 500 points below them shouldn't see much change in their variance.

    let adjusted_mean_gap_a = (mean_a - mean_a_new).powf(2.0);
    let adjusted_mean_gap_b = (mean_b - mean_b_new).powf(2.0);

    if adjusted_mean_gap_a < 1.0 {
        sigma_a_new = sigma_a * (1.0 - adjusted_mean_gap_a) + sigma_a_new * adjusted_mean_gap_a
    }
    if adjusted_mean_gap_b < 1.0 {
        sigma_b_new = sigma_b * (1.0 - adjusted_mean_gap_b) + sigma_b_new * adjusted_mean_gap_b
    }

    //# Important to note that a suprising event applies to both players
    //# An upset increases variance for both players, and an expected result decreases it

    //# One last detail to help the stability of the overall model.
    //Clip drift between 1 and 500
    sigma_a_new = f64::min(500.0, f64::max(1.0, sigma_a_new));
    sigma_b_new = f64::min(500.0, f64::max(1.0, sigma_b_new));    

    //#This should be complimented with real time variance increase. I'd suggest no change for the first 21 hours, and then a old_variance*1.05 + 1 increase every 21 hours after.
    //#There are advantages to not using 24 hours.

    (
        mean_a_new,
        sigma_a_new,
        mean_b_new,
        sigma_b_new,
        win_prob.into(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn calc(mean_a: f64, sigma_a: f64, mean_b: f64, sigma_b: f64, a_wins: bool) -> (f64, f64, f64, f64, f64) {
        let (mean_a, mean_b, sigma_a, sigma_b, win) = update_mean_and_variance(mean_a, sigma_a, mean_b, sigma_b, a_wins);
        let mean_a = format!("{:.2}", mean_a).parse::<f64>().unwrap();
        let sigma_a = format!("{:.2}", sigma_a).parse::<f64>().unwrap();
        let mean_b = format!("{:.2}", mean_b).parse::<f64>().unwrap();
        let sigma_b = format!("{:.2}", sigma_b).parse::<f64>().unwrap();
        let win = format!("{:.2}", win).parse::<f64>().unwrap();
        (mean_a, mean_b, sigma_a, sigma_b, win)
    }

    #[tokio::test]
    async fn test_1500w10_1500w10() {
        let (mean_a, sigma_a, mean_b, sigma_b, win) = calc(1500.0, 10.0, 1500.0, 10.0, true).await;

        assert_eq!(mean_a, 1501.93);
        assert_eq!(sigma_a, 9.95);
        assert_eq!(mean_b, 1498.07);
        assert_eq!(sigma_b, 9.95);
        assert_eq!(win, 0.5);
    }

    #[tokio::test]
    async fn test_2100w3_1700w20() {
      let (mean_a, sigma_a, mean_b, sigma_b, win) = calc(2100.0, 3.0, 1700.0, 20.0, false).await;

        assert_eq!(mean_a, 2097.96);
        assert_eq!(sigma_a, 4.13);
        assert_eq!(mean_b, 1706.26);
        assert_eq!(sigma_b, 24.75);
        assert_eq!(win, 0.94);
    }

    #[tokio::test]
    async fn test_1700w10_1800w50() {
        let (mean_a, sigma_a, mean_b, sigma_b, win) = calc(1700.0, 10.0, 1800.0, 50.0, true).await;

        assert_eq!(mean_a, 1701.89);
        assert_eq!(sigma_a, 10.71);
        assert_eq!(mean_b, 1791.07);
        assert_eq!(sigma_b, 53.17);
        assert_eq!(win, 0.37);
    }

    #[tokio::test]
    async fn test_1700w499_1800w499() {
        let (mean_a, sigma_a, mean_b, sigma_b, win) = calc(1700.5, 499.0, 1800.5, 499.0, true).await;

        assert_eq!(mean_a, 1758.31);
        assert_eq!(sigma_a, 500.00);
        assert_eq!(mean_b, 1742.69);
        assert_eq!(sigma_b, 500.00);
        assert_eq!(win, 0.46);
    }
    
    #[tokio::test]
    async fn test_2000w1_1500w200_a() {
        let (mean_a, sigma_a, mean_b, sigma_b, win) = calc(2000.0, 1.0, 1500.0, 200.0, true).await;

        assert_eq!(mean_a, 2000.26);
        assert_eq!(sigma_a, 1.00);
        assert_eq!(mean_b, 1493.36);
        assert_eq!(sigma_b, 162.00);
        assert_eq!(win, 0.87);
    }

    #[tokio::test]
    async fn test_2000w1_1500w200_b() {
        let (mean_a, sigma_a, mean_b, sigma_b, win) = calc(2000.0, 1.0, 1500.0, 200.0, false).await;

        assert_eq!(mean_a, 1998.26);
        assert_eq!(sigma_a, 1.56);
        assert_eq!(mean_b, 1545.06);
        assert_eq!(sigma_b, 236.36);
        assert_eq!(win, 0.87);
    }
}
